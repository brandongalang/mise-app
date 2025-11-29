"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile, Household } from "@/types/auth";
import { createClient } from "@/utils/supabase/client"; // Assumed path, will verify
import { useRouter } from "next/navigation";

// Mock data for initial development without backend
const MOCK_HOUSEHOLD: Household = {
  id: "mock-household-id",
  name: "The Skywalker Family",
  createdAt: new Date(),
};

const MOCK_PROFILES: Profile[] = [
  {
    id: "p1",
    householdId: "mock-household-id",
    displayName: "Anakin",
    avatarColor: "classic-red",
    pinHash: "hashed_1234", // Has PIN
    isAdmin: true,
    createdAt: new Date(),
  },
  {
    id: "p2",
    householdId: "mock-household-id",
    displayName: "Padmé",
    avatarColor: "royal-purple",
    pinHash: null, // No PIN
    isAdmin: true,
    createdAt: new Date(),
  },
  {
    id: "p3",
    householdId: "mock-household-id",
    displayName: "Luke",
    avatarColor: "ocean-blue",
    pinHash: null,
    isAdmin: false,
    createdAt: new Date(),
  },
  {
    id: "p4",
    householdId: "mock-household-id",
    displayName: "Leia",
    avatarColor: "jungle-green",
    pinHash: null,
    isAdmin: false,
    createdAt: new Date(),
  },
];

interface SessionContextType {
  household: Household | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  selectProfile: (profileId: string) => void;
  signOut: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // In a real implementation, this would fetch from Supabase
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // Simulating fetch delay
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // For now, we mock being logged in as a user who belongs to MOCK_HOUSEHOLD
      setHousehold(MOCK_HOUSEHOLD);
      setProfiles(MOCK_PROFILES);

      // Check if profile is already stored in local storage
      const storedProfileId = localStorage.getItem("active_profile_id");
      if (storedProfileId) {
        const found = MOCK_PROFILES.find((p) => p.id === storedProfileId);
        if (found) {
          setActiveProfile(found);
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const selectProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setActiveProfile(profile);
      localStorage.setItem("active_profile_id", profile.id);
    }
  };

  const signOut = async () => {
    setActiveProfile(null);
    localStorage.removeItem("active_profile_id");
    // await supabase.auth.signOut();
    router.push("/login");
  };

  const refreshProfiles = async () => {
     // Re-fetch profiles logic
     setProfiles([...MOCK_PROFILES]);
  };

  return (
    <SessionContext.Provider
      value={{
        household,
        profiles,
        activeProfile,
        isLoading,
        selectProfile,
        signOut,
        refreshProfiles,
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
