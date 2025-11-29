export interface Profile {
  id: string;
  household_id: string;
  display_name: string;
  avatar_url: string;
  is_owner: boolean;
  pin_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}
