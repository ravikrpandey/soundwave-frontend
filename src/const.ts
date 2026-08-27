import { getSupabaseClient } from "@/lib/supabase";

/**
 * Starts the Supabase-managed Google OAuth flow from a deliberate user action.
 * The Vite base path keeps the return target inside the GitHub Pages project
 * when Soundwave is deployed below `/soundwave-frontend/`.
 */
export async function startLogin() {
  const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) throw error;
}
