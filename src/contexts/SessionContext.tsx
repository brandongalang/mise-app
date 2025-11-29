'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { api } from '@/db/supabase';

// Avatar color palette (adapted for warm kitchen aesthetic)
export const AVATAR_COLORS = {
  terracotta: 'bg-gradient-to-br from-terracotta to-terracotta-dark',
  olive: 'bg-gradient-to-br from-olive-light to-olive',
  marigold: 'bg-gradient-to-br from-marigold to-amber-600',
  sage: 'bg-gradient-to-br from-sage to-emerald-600',
  plum: 'bg-gradient-to-br from-purple-400 to-purple-600',
  ocean: 'bg-gradient-to-br from-blue-400 to-blue-600',
} as const;

export type AvatarColor = keyof typeof AVATAR_COLORS;

export interface Profile {
  id: string;
  household_id: string;
  display_name: string;
  avatar_color: AvatarColor;
  has_pin: boolean; // SECURITY: Never expose actual pin_hash to client
  is_admin: boolean;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

// PIN validation response with rate limiting info
export interface PinValidationResult {
  success: boolean;
  error?: 'unauthorized' | 'locked' | 'invalid';
  message?: string;
  locked_until?: string;
  attempts_remaining?: number;
}

interface SessionContextValue {
  // State
  household: Household | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;

  // Profile actions
  selectProfile: (profile: Profile) => void;
  exitProfile: () => void;
  validatePin: (profileId: string, pin: string) => Promise<PinValidationResult>;

  // Profile management
  createProfile: (displayName: string, avatarColor: AvatarColor) => Promise<Profile>;
  updateProfile: (id: string, updates: { display_name?: string; avatar_color?: string }) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  setProfilePin: (id: string, pin: string | null) => Promise<boolean>;

  // Household management
  updateHousehold: (name: string) => Promise<Household>;

  // Data refresh
  refreshProfiles: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const PROFILE_STORAGE_KEY = 'mise_active_profile_id';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load household and profiles on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const [householdData, profilesData] = await Promise.all([
          api.households.get(),
          api.profiles.findAll(),
        ]);

        setHousehold(householdData);
        setProfiles(profilesData as Profile[]);

        // Try to restore active profile from localStorage
        const storedProfileId = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (storedProfileId) {
          const storedProfile = profilesData.find((p: Profile) => p.id === storedProfileId);
          if (storedProfile) {
            setActiveProfile(storedProfile as Profile);
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const selectProfile = useCallback((profile: Profile) => {
    setActiveProfile(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, profile.id);
  }, []);

  const exitProfile = useCallback(() => {
    setActiveProfile(null);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, []);

  const validatePin = useCallback(async (profileId: string, pin: string) => {
    return api.profiles.validatePin(profileId, pin);
  }, []);

  const refreshProfiles = useCallback(async () => {
    const profilesData = await api.profiles.findAll();
    setProfiles(profilesData as Profile[]);

    // Update active profile if it still exists
    if (activeProfile) {
      const updated = profilesData.find((p: Profile) => p.id === activeProfile.id);
      if (updated) {
        setActiveProfile(updated as Profile);
      } else {
        exitProfile();
      }
    }
  }, [activeProfile, exitProfile]);

  const createProfile = useCallback(async (displayName: string, avatarColor: AvatarColor) => {
    const profile = await api.profiles.create({
      display_name: displayName,
      avatar_color: avatarColor,
    });
    await refreshProfiles();
    return profile as Profile;
  }, [refreshProfiles]);

  const updateProfile = useCallback(async (id: string, updates: { display_name?: string; avatar_color?: string }) => {
    const profile = await api.profiles.update(id, updates);
    await refreshProfiles();
    return profile as Profile;
  }, [refreshProfiles]);

  const deleteProfile = useCallback(async (id: string) => {
    await api.profiles.delete(id);
    await refreshProfiles();
  }, [refreshProfiles]);

  const setProfilePin = useCallback(async (id: string, pin: string | null) => {
    const result = await api.profiles.setPin(id, pin);
    await refreshProfiles();
    return result;
  }, [refreshProfiles]);

  const updateHousehold = useCallback(async (name: string) => {
    const updated = await api.households.update({ name });
    setHousehold(updated);
    return updated as Household;
  }, []);

  return (
    <SessionContext.Provider
      value={{
        household,
        profiles,
        activeProfile,
        isLoading,
        selectProfile,
        exitProfile,
        validatePin,
        createProfile,
        updateProfile,
        deleteProfile,
        setProfilePin,
        updateHousehold,
        refreshProfiles,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
