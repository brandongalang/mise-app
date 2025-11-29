# Implementation Plan: Household & Profile Architecture

## Objective
Implement a multi-tenant architecture supporting separate "Households" (families/groups) and individual "Profiles" (Netflix-style) within those households. Each profile will be secured by a 4-digit PIN. The data model will enforce strict isolation—users in one household cannot see or access data from another.

## 1. Architecture Overview

### Concept
*   **Household:** The top-level tenant. Corresponds to a billing account or a physical home.
*   **Profile:** A specific user within a household (e.g., "Mom", "Dad", "Kids").
*   **Data Scope:** All inventory data (`master_ingredients`, `containers`, `recipes`) is scoped to the **Household**. Profiles act as the "actor" modifying this shared household state, but do not have separate inventories.
*   **Strict Isolation:** There is NO global shared data. `master_ingredients` are private to the household.

### Authentication Flow
1.  **Auth (Supabase):** User logs in via Email/Password (or Magic Link). This identifies the **Household**.
2.  **Profile Selection:** Upon successful auth, the user is presented with a "Who is watching?" style screen.
3.  **PIN Challenge:** User selects a profile -> enters 4-digit PIN -> Access granted.
4.  **Session:** The app stores the `active_profile_id` in the local application state (Context/Store).

## 2. Database Schema Changes

### New Tables

#### `households`
*   `id` (uuid, PK): Linked to `auth.users.id` (1-to-1 mapping for simple "One Account = One Household" model).
*   `name` (text): e.g., "The Smith Family".
*   `created_at` (timestamp).

#### `profiles`
*   `id` (uuid, PK)
*   `household_id` (uuid, FK -> `households.id`)
*   `display_name` (text): e.g., "Dad"
*   `avatar_color` (text): Hex code or preset ID.
*   `pin_hash` (text): Bcrypt hash of the 4-digit PIN.
*   `is_admin` (boolean): Ability to manage other profiles.
*   `created_at` (timestamp).

### Modified Tables (Migration)
All the following tables must have a `household_id` column added. This column **MUST** be Non-Null and Foreign Keyed to `households.id`.

*   `master_ingredients`
*   `ingredient_aliases`
*   `containers`
*   `transactions`
*   `cooked_recipes`
*   `global_unit_conversions` (Rename to `household_unit_conversions` or just scope it).

**Migration Strategy for Existing Data:**
*   Since the current app is single-tenant, all existing data belongs to a "Default Household".
*   Migration Script:
    1.  Create `households` table.
    2.  Create a default household.
    3.  Add `household_id` to all tables, defaulting to the ID of the new default household.
    4.  Add `profiles` table.
    5.  Create a default "Admin" profile (PIN: 0000) for the default household.

## 3. Supabase Security (RLS)

Enable Row Level Security (RLS) on ALL tables.

*   **Policy Rule:** `auth.uid() = household.id` (Assuming 1 Auth User = 1 Household).
*   **Expression:** `household_id = auth.uid()`

*Example Policy for `containers`:*
```sql
CREATE POLICY "Household Isolation" ON containers
FOR ALL
USING (household_id = auth.uid());
```

## 4. Frontend & UI Implementation Guidelines

### A. State Management
*   Create a `SessionProvider` (Context API).
*   **State:**
    *   `user`: Supabase Auth User.
    *   `household`: Current Household Metadata.
    *   `activeProfile`: The selected profile object (null if locked).
    *   `isLoading`: Auth state.

### B. Screens / Views

#### 1. Landing / Login
*   **New Page:** `src/app/login/page.tsx`
*   **Components:** Simple email/password form using Supabase Auth UI helpers or custom form.
*   **Redirect:** On success -> `/profiles`.

#### 2. Profile Selection ("Who is cooking?")
*   **New Page:** `src/app/profiles/page.tsx`
*   **Design:**
    *   Grid layout centered on screen.
    *   Big circular avatars with names below.
    *   "Add Profile" button (dotted circle) at the end of the list.
    *   "Manage Profiles" button (top right).
*   **Interaction:**
    *   Click Profile -> Open Modal/Overlay for PIN Entry.
    *   PIN Input: 4 individual boxes (auto-focus next).
    *   Success -> Redirect to `/` (Dashboard).

#### 3. Dashboard Header Update
*   **Location:** `src/components/layout/MainLayout.tsx`
*   **Change:** Add a "Profile Switcher" in the top right.
    *   Display current avatar.
    *   Dropdown menu:
        *   List other profiles (Quick switch).
        *   "Exit Profile" (Returns to profile selection).
        *   "Sign Out" (Logs out of Supabase).

### C. Agent Context
*   The `ChatContainer` and `agent` tools must now inject the `household_id` into every database call.
*   **Update:** `src/db/supabase.ts` or the repository layer to automatically attach `household_id` from the session/auth context, or rely on RLS (implicit).
*   **Agent Prompt:** Update the system prompt to know *who* it is talking to (e.g., "You are talking to John").

## 5. Execution Steps

1.  **Database Migration (SQL):**
    *   Write the Drizzle migration to create tables and alter existing ones.
    *   Execute migration.
2.  **Backend Logic:**
    *   Update `src/db/schema.ts` (Drizzle definitions).
    *   Update `src/db/supabase.ts` (API wrappers) to handle `household_id` creation/filtering.
3.  **Auth Setup:**
    *   Implement Login Page.
    *   Implement Registration (creates Household + Admin Profile).
4.  **Profile UI:**
    *   Build `ProfileCard` component.
    *   Build `PinEntry` component.
    *   Build `ProfileSelection` page.
5.  **Integration:**
    *   Protect the main dashboard route (`/`); redirect to `/login` if no user, or `/profiles` if no profile selected.
    *   Update Agent tools to respect the current household scope (mostly handled by RLS, but explicit is better).
6.  **Testing:**
    *   Create two accounts.
    *   Verify User A cannot see User B's inventory.
    *   Verify PIN protection works.
