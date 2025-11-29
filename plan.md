# Implementation Plan: Household & Profile Architecture

## Objective
Implement a multi-tenant architecture supporting separate "Households" (families/groups) and individual "Profiles" (Netflix-style) within those households. Each profile will be secured by a 4-digit PIN. The data model will enforce strict isolation—users in one household cannot see or access data from another.

## 1. Architecture Overview

### Concept
*   **Household:** The top-level tenant. Corresponds to a billing account or a physical home.
*   **Profile:** A specific user within a household (e.g., "Mom", "Dad", "Kids").
*   **Data Scope:** All inventory data (`master_ingredients`, `containers`, `recipes`, `transactions`) is scoped to the **Household**. Profiles act as the "actor" modifying this shared household state.
*   **Strict Isolation:** There is NO global shared data. `master_ingredients` are private to the household. This avoids "polluting" one family's autocomplete with another family's custom items.

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
  // Future: subscription_status, max_profiles, etc.
});
```

#### `profiles`
Users within the household.
```typescript
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull().default("blue"), // orange, green, purple, etc.
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
2.  **Seed Default Household:** Create a script that looks for all data currently without a `household_id` (which is everything).
    *   Create a "Legacy Household" in the `households` table (ID: `0000...`).
    *   Create a default "Admin" profile for it.
3.  **Bulk Update:** Update all existing rows in `containers`, `master_ingredients`, etc., setting `household_id = '0000...'`.
4.  **Enforce Constraint:** Alter the columns to be `NOT NULL`.
5.  **Post-Migration:** For new users, a Postgres Trigger on `auth.users` will automatically create a row in `households`.

## 3. Supabase Security (Row Level Security)

Enable RLS on **ALL** tables. The golden rule is: **"Users can only see rows where `household_id` matches their Auth ID."**

### RLS Policies
We will apply a standard policy across all tables (`containers`, `master_ingredients`, etc.).

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

## 4. Frontend & UI Implementation Guidelines

### A. State Management (`SessionContext`)
Create a robust context to manage the "User -> Household -> Profile" hierarchy.

```typescript
interface SessionContextType {
  user: User | null;              // Supabase Auth User
  household: Household | null;    // The fetched household row
  activeProfile: Profile | null;  // The currently selected profile
  profiles: Profile[];            // List of all profiles (for switching)
  isLoading: boolean;

  selectProfile: (profileId: string, pin?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}
```

### B. Screens / Views

#### 1. Landing / Login (`/login`)
*   **Design:** Clean, centered card.
*   **Functionality:**
    *   Email/Password Input.
    *   "Sign Up" toggle.
    *   On Submit: `supabase.auth.signInWithPassword`.
    *   On Success: Fetch household. If no profile selected, redirect to `/profiles`.

#### 2. Profile Selection (`/profiles`)
*   **Route Protection:** Accessible only if Authenticated.
*   **Layout:**
    *   Heading: "Who's in the kitchen?"
    *   Grid: Flex-wrap, centered.
*   **Component: `ProfileCard`**
    *   Circle div (w-32 h-32), hover:scale-105 transition.
    *   Dynamic background color based on `avatarColor` (tail-wind: `bg-blue-500`, `bg-red-500`).
    *   First letter of `displayName` in center (text-4xl white bold).
    *   Name text below.
*   **Component: `AddProfileButton`**
    *   Dashed border circle.
    *   Plus icon.
    *   Opens a small modal to enter Name and optional PIN.

#### 3. PIN Entry Modal
*   **Trigger:** Clicking a locked profile.
*   **UI:**
    *   "Enter PIN for [Name]"
    *   4 inputs (`<input type="password" maxLength={1} />`).
    *   **Logic:**
        *   `onChange`: Update state, auto-focus next input.
        *   `onKeyDown`: Backspace moves focus to previous.
        *   On 4th digit: Auto-submit.
    *   **Animation:** Shake animation on incorrect PIN.

#### 4. Dashboard Integration
*   **Header:**
    *   Top right corner shows `activeProfile` avatar (small).
    *   Hover/Click -> Dropdown menu.
        *   "Switch Profile" (Redirects to `/profiles`).
        *   "Account Settings" (Household name, etc.).
        *   "Log Out".

### C. Agent & Backend Context
The Agent must be "Household Aware".

1.  **Tool Update:** All DB tools (`searchInventory`, `addInventory`) currently assume a global scope or need explicit filtering.
    *   **Action:** Update `src/db/supabase.ts`.
    *   **Implementation:** The API client should ideally be instantiated *per request* or *per session* with the `household_id`.
    *   *Simplification:* Since we rely on RLS (`auth.uid()`), the Supabase client created with `createClientComponentClient` (frontend) automatically sends the Auth token. RLS handles the filtering "magically".
    *   **Server-Side:** For the Agent (running on server/edge), we must ensure we create the Supabase client *using the user's session token*, NOT the Service Role key (unless we manually enforce the `household_id` filter).
    *   **Guidance:** **ALWAYS pass the user's Access Token to the Agent.** Do not let the Agent run as Admin.

## 5. Execution Steps & Checklist

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

4.  **UI Construction**
    *   [ ] Build `/login` page.
    *   [ ] Build `/profiles` page.
    *   [ ] Build `PinInput` component.
    *   [ ] Update `MainLayout` header.

5.  **Agent Logic**
    *   [ ] Verify Agent tools use `supabase` client with user context.
    *   [ ] Test that "Dad's" inventory doesn't show up for "Mom" (if they were in different households—though here they share. Test that User A doesn't see User B's).
