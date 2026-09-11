import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isLiveSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder-project') &&
    supabaseServiceRoleKey &&
    !supabaseServiceRoleKey.includes('placeholder')
  );
};

// Client for public/anon requests
export const supabasePublic: SupabaseClient | null = isLiveSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side administrative client using Service Role Key (bypasses RLS safely on server)
export const supabaseAdmin: SupabaseClient | null = isLiveSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'secure-content';
