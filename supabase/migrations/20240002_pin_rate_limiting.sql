-- Migration: PIN Rate Limiting
-- Adds rate limiting to prevent brute-force attacks on 4-digit PINs

-- Create table to track failed PIN attempts
CREATE TABLE IF NOT EXISTS pin_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pin_attempts_profile_time
    ON pin_attempts(profile_id, attempted_at DESC);

-- Enable RLS
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see attempts for their household's profiles
CREATE POLICY "Tenant isolation for pin_attempts" ON pin_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = pin_attempts.profile_id
            AND profiles.household_id = auth.uid()
        )
    );

-- Drop old function and recreate with rate limiting
DROP FUNCTION IF EXISTS public.validate_profile_pin(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.validate_profile_pin(
    p_profile_id UUID,
    p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
    stored_hash TEXT;
    profile_household UUID;
    recent_failures INT;
    lockout_until TIMESTAMPTZ;
    is_valid BOOLEAN;
    result JSON;
BEGIN
    -- Get the profile's household and pin hash
    SELECT household_id, pin_hash INTO profile_household, stored_hash
    FROM public.profiles
    WHERE id = p_profile_id;

    -- Verify the profile belongs to the current user's household
    IF profile_household IS NULL OR profile_household != auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'unauthorized');
    END IF;

    -- Check for rate limiting: count failures in last 5 minutes
    SELECT COUNT(*) INTO recent_failures
    FROM public.pin_attempts
    WHERE profile_id = p_profile_id
      AND success = FALSE
      AND attempted_at > NOW() - INTERVAL '5 minutes';

    -- Lockout thresholds:
    -- 3 failures: 30 second lockout
    -- 5 failures: 2 minute lockout
    -- 10+ failures: 5 minute lockout
    IF recent_failures >= 10 THEN
        SELECT MAX(attempted_at) + INTERVAL '5 minutes' INTO lockout_until
        FROM public.pin_attempts
        WHERE profile_id = p_profile_id AND success = FALSE;

        IF lockout_until > NOW() THEN
            RETURN json_build_object(
                'success', false,
                'error', 'locked',
                'locked_until', lockout_until,
                'message', 'Too many attempts. Try again in 5 minutes.'
            );
        END IF;
    ELSIF recent_failures >= 5 THEN
        SELECT MAX(attempted_at) + INTERVAL '2 minutes' INTO lockout_until
        FROM public.pin_attempts
        WHERE profile_id = p_profile_id AND success = FALSE;

        IF lockout_until > NOW() THEN
            RETURN json_build_object(
                'success', false,
                'error', 'locked',
                'locked_until', lockout_until,
                'message', 'Too many attempts. Try again in 2 minutes.'
            );
        END IF;
    ELSIF recent_failures >= 3 THEN
        SELECT MAX(attempted_at) + INTERVAL '30 seconds' INTO lockout_until
        FROM public.pin_attempts
        WHERE profile_id = p_profile_id AND success = FALSE;

        IF lockout_until > NOW() THEN
            RETURN json_build_object(
                'success', false,
                'error', 'locked',
                'locked_until', lockout_until,
                'message', 'Too many attempts. Try again in 30 seconds.'
            );
        END IF;
    END IF;

    -- If no PIN is set, return success (no validation needed)
    IF stored_hash IS NULL THEN
        RETURN json_build_object('success', true);
    END IF;

    -- Validate PIN using bcrypt
    is_valid := (stored_hash = crypt(p_pin, stored_hash));

    -- Log the attempt
    INSERT INTO public.pin_attempts (profile_id, success)
    VALUES (p_profile_id, is_valid);

    -- On success, clear old failure records for this profile
    IF is_valid THEN
        DELETE FROM public.pin_attempts
        WHERE profile_id = p_profile_id
          AND success = FALSE
          AND attempted_at < NOW() - INTERVAL '1 hour';
    END IF;

    IF is_valid THEN
        RETURN json_build_object('success', true);
    ELSE
        -- Return remaining attempts info
        RETURN json_build_object(
            'success', false,
            'error', 'invalid',
            'attempts_remaining', GREATEST(0, 3 - recent_failures - 1)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup job: Delete old pin_attempts (optional, run periodically)
-- You can set up a pg_cron job or Supabase Edge Function to run this
CREATE OR REPLACE FUNCTION public.cleanup_old_pin_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM public.pin_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
