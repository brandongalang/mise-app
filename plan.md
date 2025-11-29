# Implementation Plan: Household & Profile Architecture

## Objective
Implement a multi-tenant architecture supporting separate "Households" (families/groups) and individual "Profiles" (Netflix-style) within those households. Each profile will be secured by a 4-digit PIN. The data model will enforce strict isolation—users in one household cannot see or access data from another.

## 1. Architecture Overview

### Concept
*   **Household:** The top-level tenant. Corresponds to a billing account or a physical home.
*   **Profile:** A specific user within a household (e.g., "Mom", "Dad", "Kids").
*   **Data Scope:** All inventory data (`master_ingredients`, `containers`, `recipes`, `transactions`) is scoped to the **Household**. Profiles act as the "actor" modifying this shared household state.
*   **Strict Isolation:** There is NO global shared data. `master_ingredients` are private to the household.

### Authentication Flow
1.  **Auth (Supabase):** User logs in via Email/Password. This identifies the **Household** (1 Auth User = 1 Household).
2.  **Profile Selection:** Upon successful auth, the user is presented with a "Who is cooking?" screen.
3.  **PIN Challenge:**
    *   User selects a profile.
    *   If the profile has a PIN, a modal appears.
    *   User enters 4-digit PIN.
    *   Validation happens locally (hash comparison) or via safe RPC.
4.  **Session:** The app stores the `active_profile_id` in the global `SessionContext`.

## 2. Database Schema Changes (Drizzle)

### A. New Tables

#### `households`
This table links the Supabase Auth User to the application data.
```typescript
export const households = pgTable("households", {
  id: uuid("id").primaryKey(), // Matches auth.users.id
  name: text("name").notNull().default("My Household"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### `profiles`
Users within the household.
```typescript
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull().default("blue"), // See UI section for palette
  pinHash: text("pin_hash"), // Null = no PIN. Bcrypt hash.
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### B. Modified Tables (Migration)
All the following tables must have a `household_id` column added. This column **MUST** be Non-Null and Foreign Keyed to `households.id`.

*   `master_ingredients`
*   `ingredient_aliases`
*   `containers`
*   `transactions`
*   `cooked_recipes`
*   `global_unit_conversions` -> **Rename to** `household_unit_conversions`

**Migration Strategy (Zero Downtime / Data Preservation):**
1.  **Create Tables:** Create `households` and `profiles`.
2.  **Seed Default Household:** Create a script that looks for all data currently without a `household_id`.
    *   Create a "Legacy Household" in the `households` table (ID: `0000...`).
    *   Create a default "Admin" profile for it.
3.  **Bulk Update:** Update all existing rows in `containers`, `master_ingredients`, etc., setting `household_id = '0000...'`.
4.  **Enforce Constraint:** Alter the columns to be `NOT NULL`.
5.  **Post-Migration:** For new users, a Postgres Trigger on `auth.users` will automatically create a row in `households`.

## 3. Supabase Security (Row Level Security)

Enable RLS on **ALL** tables. The golden rule is: **"Users can only see rows where `household_id` matches their Auth ID."**

**Policy: "Tenant Isolation"**
```sql
-- 1. Enable RLS
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy
CREATE POLICY "Users can only access their own household data" ON containers
    FOR ALL
    USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());
```

### Automatic Household Creation (Trigger)
To ensure every signup has a household:
```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.households (id, name)
  values (new.id, 'My Household');

  insert into public.profiles (household_id, display_name, is_admin, avatar_color)
  values (new.id, 'Admin', true, 'blue');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 4. Frontend & UI/UX Implementation Guidelines

This is the core of the "Netflix Experience". It must feel fluid, tactile, and polished.

### A. Visual Language & Palette
Use bold, vibrant gradients for avatars to contrast against a clean background.

*   **Avatar Variants (CSS Classes):**
    *   `classic-red`: `bg-gradient-to-br from-red-500 to-red-700`
    *   `ocean-blue`: `bg-gradient-to-br from-blue-400 to-blue-600`
    *   `jungle-green`: `bg-gradient-to-br from-emerald-400 to-emerald-600`
    *   `royal-purple`: `bg-gradient-to-br from-purple-500 to-purple-700`
    *   `sunny-yellow`: `bg-gradient-to-br from-yellow-400 to-orange-500`

### B. Profile Selection Page (`/profiles`)

**Layout:**
*   Centered content on a dark or neutral background (e.g., `bg-neutral-950`).
*   **Header:** "Who's cooking today?" (Font: Fraunces, Text: 3xl/4xl, Fade-in on load).

**Animation (Framer Motion):**
*   **Container:** `staggerChildren: 0.1` (Profiles pop in one by one).
*   **Profile Card:**
    *   *Initial:* `{ opacity: 0, scale: 0.9 }`
    *   *Animate:* `{ opacity: 1, scale: 1 }`
    *   *Hover:* `{ scale: 1.1, y: -5 }` (Spring stiffness: 300).
    *   *Tap:* `{ scale: 0.95 }`
*   **Lock Icon:**
    *   If profile has PIN (`pin_hash != null`), show a small Lock icon (Lucide `Lock`) centered in the avatar, but *faded out* (`opacity: 0`).
    *   *On Hover:* Lock icon fades in (`opacity: 1`) and scales up slightly.

**Interaction:**
*   **Click:**
    *   If No PIN -> Set Context -> `router.push('/')`.
    *   If PIN -> Open PIN Modal.

### C. PIN Entry Experience (The "Netflix" Feel)

**Component: `PinModal`**
*   **Overlay:** `fixed inset-0 bg-black/80 backdrop-blur-sm` (Fade in).
*   **Content:**
    *   Heading: "Enter PIN for [Name]" (Text-white, lg).
    *   **Input Area:** 4 large circles (w-4 h-4).
        *   **Empty:** Border-2 border-white/50 bg-transparent.
        *   **Filled:** `bg-white` border-white (Scale up pop effect on fill).
    *   **Hidden Input:** A real `<input type="number" pattern="[0-9]*" />` that is opacity-0 but covers the area or captures focus. This ensures mobile keyboard pops up.

**Behavior:**
*   **Auto-Focus:** Input focuses immediately on mount.
*   **Success:**
    *   All 4 dots fill.
    *   Brief pause (300ms).
    *   Modal fades out.
    *   Redirect.
*   **Error (Incorrect PIN):**
    *   **Shake Animation:** The entire dot container shakes left-right (x: [-10, 10, -10, 10, 0]).
    *   **Reset:** Dots clear after shake.
    *   **Haptic:** If possible (`navigator.vibrate`), trigger a short buzz.

### D. "Manage Profiles" Mode
*   **Toggle:** "Manage Profiles" button at top right.
*   **State:** When active, a Pencil Icon (`Pencil`) overlays *every* avatar.
*   **Click:** Opens `EditProfileModal` instead of selecting.
    *   Edit Name.
    *   Change Color.
    *   Set/Remove PIN.
    *   Delete Profile (if not last Admin).

### E. Dashboard Header Update
*   **Avatar:** Small (w-8 h-8) version of the gradient circle.
*   **Dropdown (Vaul or Radix UI):**
    *   **Animation:** Slide down + Fade in.
    *   **Items:**
        *   Grid of *other* profiles (Quick Switch).
        *   "Exit Profile" (Log out of profile, keep household logged in).
        *   Separator.
        *   "Sign Out of [Household Name]".

## 5. Execution Steps

1.  **Migration Script (SQL)**
    *   [ ] Write `0001_household_migration.sql`.
    *   [ ] Define `households` and `profiles`.
    *   [ ] Alter existing tables (Add `household_id`).
    *   [ ] Create RLS Policies.
    *   [ ] Create Auth Trigger.

2.  **Schema Update (Code)**
    *   [ ] Update `src/db/schema.ts` with new tables and relations.
    *   [ ] Run `drizzle-kit push` or migration.

3.  **Authentication & Context**
    *   [ ] Implement `SessionProvider`.
    *   [ ] Wrap root layout.

4.  **UI Construction (The Fun Part)**
    *   [ ] **Install:** Ensure `framer-motion` is available.
    *   [ ] **Login Page:** Build `/login` (Clean, simple).
    *   [ ] **Profile Page:** Build `/profiles` with the *exact* Framer Motion specs above.
    *   [ ] **Pin Component:** Build `<PinPad />` with the "Shake" and "Dot Fill" logic.
    *   [ ] **Header:** Update `MainLayout` with the Profile Switcher.

5.  **Agent Logic**
    *   [ ] Verify Agent tools use `supabase` client with user context.
    *   [ ] Test that "Dad's" inventory doesn't show up for "Mom" (if they were in different households).
