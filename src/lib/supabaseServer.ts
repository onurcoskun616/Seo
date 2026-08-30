import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key.
 * Never import this from client components.
 */
export function getSupabaseServer(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil. .env.local dosyanızı kontrol edin."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false }
  });
  return cached;
}
