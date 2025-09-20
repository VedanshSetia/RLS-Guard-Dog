
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client for frontend/browser usage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Only create the admin client in a server-side context
import type { SupabaseClient } from '@supabase/supabase-js';
let supabaseAdmin: SupabaseClient<Database> | undefined = undefined;
if (typeof window === 'undefined') {
  supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
}
export { supabaseAdmin };

