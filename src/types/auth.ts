// src/types/auth.ts
export type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  avatarColor: string; // "classic-red" | "ocean-blue" | "jungle-green" | "royal-purple" | "sunny-yellow"
  pinHash: string | null;
  isAdmin: boolean | null;
  createdAt: Date | null;
};

export type Household = {
  id: string;
  name: string;
  createdAt: Date | null;
};
