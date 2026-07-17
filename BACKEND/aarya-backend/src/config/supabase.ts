import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// Environment validation
// ============================================================

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      'Copy .env.example to .env and fill in your Supabase credentials.'
    );
  }
}

const SUPABASE_URL            = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY       = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================
// Public (anon) client
// Used to verify incoming JWTs from the frontend.
// Subject to Row Level Security.
// ============================================================
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// ============================================================
// Admin (service_role) client
// Bypasses ALL RLS policies.
// NEVER expose this client's key to the frontend.
// Used exclusively for trusted server-side operations:
//   – Bulk CSV inserts
//   – Company + user creation during onboarding
//   – Sending invites via admin.auth API
// ============================================================
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
