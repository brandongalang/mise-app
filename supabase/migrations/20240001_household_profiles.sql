-- Migration: Household & Profile Multi-Tenant Architecture
-- This migration adds households (tenants) and profiles (users within households)

-- ============================================
-- 1. CREATE NEW TABLES
-- ============================================

-- Households table - links Supabase Auth User to app data
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    name TEXT NOT NULL DEFAULT 'My Household',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table - users within a household
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT 'terracotta',
    pin_hash TEXT, -- NULL = no PIN, bcrypt hash if set
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick profile lookups by household
CREATE INDEX IF NOT EXISTS idx_profiles_household ON profiles(household_id);

-- ============================================
-- 2. ADD household_id TO EXISTING TABLES
-- ============================================

-- Add columns (nullable initially for migration)
ALTER TABLE master_ingredients ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE ingredient_aliases ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE cooked_recipes ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE global_unit_conversions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Create indexes for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_master_ingredients_household ON master_ingredients(household_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_household ON ingredient_aliases(household_id);
CREATE INDEX IF NOT EXISTS idx_containers_household ON containers(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_cooked_recipes_household ON cooked_recipes(household_id);

-- ============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooked_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- Households: users can only access their own household
CREATE POLICY "Users can access own household" ON households
    FOR ALL USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Profiles: users can access profiles in their household
CREATE POLICY "Users can access household profiles" ON profiles
    FOR ALL USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());

-- Master ingredients: tenant isolation
CREATE POLICY "Tenant isolation for master_ingredients" ON master_ingredients
    FOR ALL USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());

-- Ingredient aliases: tenant isolation
CREATE POLICY "Tenant isolation for ingredient_aliases" ON ingredient_aliases
    FOR ALL USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());

-- Containers: tenant isolation
CREATE POLICY "Tenant isolation for containers" ON containers
    FOR ALL USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());

-- Contents: access via container's household
CREATE POLICY "Tenant isolation for contents" ON contents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM containers
            WHERE containers.id = contents.container_id
            AND containers.household_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM containers
            WHERE containers.id = contents.container_id
            AND containers.household_id = auth.uid()
        )
    );

-- Transactions: tenant isolation
CREATE POLICY "Tenant isolation for transactions" ON transactions
    FOR ALL USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());

-- Cooked recipes: tenant isolation
CREATE POLICY "Tenant isolation for cooked_recipes" ON cooked_recipes
    FOR ALL USING (household_id = auth.uid())
    WITH CHECK (household_id = auth.uid());

-- Unit conversions: tenant isolation (or global if household_id is null for legacy)
CREATE POLICY "Tenant isolation for global_unit_conversions" ON global_unit_conversions
    FOR ALL USING (household_id = auth.uid() OR household_id IS NULL)
    WITH CHECK (household_id = auth.uid());

-- ============================================
-- 4. AUTOMATIC HOUSEHOLD CREATION ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create household for new user
    INSERT INTO public.households (id, name)
    VALUES (NEW.id, 'My Household');

    -- Create default admin profile
    INSERT INTO public.profiles (household_id, display_name, is_admin, avatar_color)
    VALUES (NEW.id, 'Chef', TRUE, 'terracotta');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. PIN VALIDATION RPC (Safe, no timing attack)
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_profile_pin(
    p_profile_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    stored_hash TEXT;
    profile_household UUID;
BEGIN
    -- Get the profile's household and pin hash
    SELECT household_id, pin_hash INTO profile_household, stored_hash
    FROM public.profiles
    WHERE id = p_profile_id;

    -- Verify the profile belongs to the current user's household
    IF profile_household != auth.uid() THEN
        RETURN FALSE;
    END IF;

    -- If no PIN is set, return true
    IF stored_hash IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Validate PIN using bcrypt (crypt extension required)
    RETURN stored_hash = crypt(p_pin, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SET PIN RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.set_profile_pin(
    p_profile_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    profile_household UUID;
BEGIN
    -- Get the profile's household
    SELECT household_id INTO profile_household
    FROM public.profiles
    WHERE id = p_profile_id;

    -- Verify the profile belongs to the current user's household
    IF profile_household != auth.uid() THEN
        RETURN FALSE;
    END IF;

    -- Set or clear the PIN
    IF p_pin IS NULL OR p_pin = '' THEN
        UPDATE public.profiles SET pin_hash = NULL WHERE id = p_profile_id;
    ELSE
        UPDATE public.profiles SET pin_hash = crypt(p_pin, gen_salt('bf')) WHERE id = p_profile_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
