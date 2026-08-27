import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

function readBrowserConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Soundwave authentication is not configured for this deployment.");
  }

  return { url, publishableKey };
}

/**
 * A single browser-only Supabase client. Its publishable key is intentionally
 * public; privileged secrets remain solely on the API and provider dashboards.
 */
export function getSupabaseClient() {
  if (!client) {
    const { url, publishableKey } = readBrowserConfig();
    client = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return client;
}
