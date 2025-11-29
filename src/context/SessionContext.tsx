"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Profile, Household } from "../types/auth";
import { useRouter } from "next/navigation";

interface SessionContextType {
  activeProfile: Profile | null;
  household: Household | null;
  profiles: Profile[];
  switchProfile: (profileId: string) => void;
  exitProfile: () => void;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const MOCK_HOUSEHOLD: Household = {
  id: "hh_123",
  name: "The Galang Family",
  owner_id: "user_1",
  invite_code: "1234",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_PROFILES: Profile[] = [
  {
    id: "prof_1",
    household_id: "hh_123",
    display_name: "Brandon",
    avatar_url: "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)",
    is_owner: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prof_2",
    household_id: "hh_123",
    display_name: "Sarah",
    avatar_url: "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
    is_owner: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prof_3",
    household_id: "hh_123",
    display_name: "Kids",
    avatar_url: "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)",
    is_owner: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(MOCK_PROFILES[0]); // Default to first for dev
  const [household, setHousehold] = useState<Household | null>(MOCK_HOUSEHOLD);
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const switchProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setActiveProfile(profile);
      // In a real app, you would verify PIN here or in the UI before calling this
    }
  };

  const exitProfile = () => {
    setActiveProfile(null);
    router.push("/profiles");
  };

  return (
    <SessionContext.Provider
      value={{
        activeProfile,
        household,
        profiles,
        switchProfile,
        exitProfile,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
