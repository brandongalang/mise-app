import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ivuxreviroawgxtiuwwr.supabase.co';
// The anon key is a public key that can be safely exposed
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dXhyZXZpcm9hd2d4dGl1d3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzODI2NjIsImV4cCI6MjA2Mzk1ODY2Mn0.57IZ7dIR3hDzB0IGMJD_NxfJGPJyLJ1bkkY_fJW3umo';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);
