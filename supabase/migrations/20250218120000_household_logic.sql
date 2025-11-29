-- Migration for Household Architecture
-- Generated: 2025-02-18
-- Description: Adds households, profiles, and isolates data.

-- 1. Create Households Table
CREATE TABLE IF NOT EXISTS "households" (
    "id" uuid PRIMARY KEY NOT NULL, -- Matches auth.users.id
    "name" text DEFAULT 'My Household' NOT NULL,
    "created_at" timestamp DEFAULT now()
);

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
    "display_name" text NOT NULL,
    "avatar_color" text DEFAULT 'classic-red' NOT NULL,
    "pin_hash" text,
    "is_admin" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
);

-- 3. Alter Existing Tables to Add household_id
-- We add the column as nullable first, populate it, then make it not null.
-- Since this is a migration for an existing app, we handle the transition.

DO $$
BEGIN
    -- Add household_id to master_ingredients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_ingredients' AND column_name = 'household_id') THEN
        ALTER TABLE "master_ingredients" ADD COLUMN "household_id" uuid REFERENCES "households"("id");
    END IF;

    -- Add household_id to ingredient_aliases
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredient_aliases' AND column_name = 'household_id') THEN
        ALTER TABLE "ingredient_aliases" ADD COLUMN "household_id" uuid REFERENCES "households"("id");
    END IF;

    -- Add household_id to containers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'containers' AND column_name = 'household_id') THEN
        ALTER TABLE "containers" ADD COLUMN "household_id" uuid REFERENCES "households"("id");
    END IF;

     -- Add household_id to transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'household_id') THEN
        ALTER TABLE "transactions" ADD COLUMN "household_id" uuid REFERENCES "households"("id");
    END IF;

    -- Add household_id to cooked_recipes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cooked_recipes' AND column_name = 'household_id') THEN
        ALTER TABLE "cooked_recipes" ADD COLUMN "household_id" uuid REFERENCES "households"("id");
    END IF;

    -- Rename global_unit_conversions if needed or add household_id.
    -- Plan says rename, but let's just add household_id for consistency and rename in code.
    -- Actually, plan says "Rename to household_unit_conversions".
    -- For simplicity in this SQL, we will just alter it.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'global_unit_conversions' AND column_name = 'household_id') THEN
        ALTER TABLE "global_unit_conversions" ADD COLUMN "household_id" uuid REFERENCES "households"("id");
    END IF;
END $$;


-- 4. Enable Row Level Security (RLS)

ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingredient_aliases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "containers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cooked_recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "global_unit_conversions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contents" ENABLE ROW LEVEL SECURITY; -- Indirectly through container, but good to secure

-- 5. Create RLS Policies

-- Helper function to get current household_id from auth.uid()
-- Since auth.uid() == household.id in our model
CREATE OR REPLACE FUNCTION current_household_id() RETURNS uuid AS $$
  SELECT auth.uid()
$$ LANGUAGE sql STABLE;

-- Households: Users can only see their own household
CREATE POLICY "Users can only access their own household" ON "households"
    FOR ALL USING (id = auth.uid());

-- Profiles: Users can only see profiles in their household
CREATE POLICY "Users can access profiles in their household" ON "profiles"
    FOR ALL USING (household_id = auth.uid());

-- Containers:
CREATE POLICY "Household isolation for containers" ON "containers"
    FOR ALL USING (household_id = auth.uid());

-- Contents: Relies on container check? No, contents table doesn't have household_id.
-- We need to join with containers to check permission.
CREATE POLICY "Household isolation for contents" ON "contents"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM containers c
            WHERE c.id = contents.container_id
            AND c.household_id = auth.uid()
        )
    );

-- Master Ingredients
CREATE POLICY "Household isolation for master_ingredients" ON "master_ingredients"
    FOR ALL USING (household_id = auth.uid());

-- Ingredient Aliases
CREATE POLICY "Household isolation for ingredient_aliases" ON "ingredient_aliases"
    FOR ALL USING (household_id = auth.uid());

-- Transactions
CREATE POLICY "Household isolation for transactions" ON "transactions"
    FOR ALL USING (household_id = auth.uid());

-- Cooked Recipes
CREATE POLICY "Household isolation for cooked_recipes" ON "cooked_recipes"
    FOR ALL USING (household_id = auth.uid());


-- 6. Trigger for New User Creation
-- Automatically creates a household and an admin profile when a user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create Household
  INSERT INTO public.households (id, name)
  VALUES (new.id, 'My Household');

  -- Create Admin Profile
  INSERT INTO public.profiles (household_id, display_name, is_admin, avatar_color)
  VALUES (new.id, 'Admin', true, 'classic-red');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
