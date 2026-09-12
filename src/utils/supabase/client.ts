import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uyqkxqlovxkgurnuxnfd.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_F-KMTWS6SQt_hOvo9UGK4A_gbDsM0SQ';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
