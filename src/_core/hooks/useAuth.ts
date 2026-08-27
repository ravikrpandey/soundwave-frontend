import { getSupabaseClient } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Keeps the Soundwave UI in sync with the Supabase browser session. The API
 * remains the source of truth for the local application user and library IDs.
 */
export function useAuth(_options?: UseAuthOptions) {
  const utils = trpc.useUtils();
  const [hasSession, setHasSession] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = getSupabaseClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        setHasSession(Boolean(data.session));
        setSessionReady(true);
      });

      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setHasSession(Boolean(session));
        setSessionReady(true);
        void utils.auth.me.invalidate();
        if (!session) utils.auth.me.setData(undefined, null);
      });
      subscription = listener.data.subscription;
    } catch {
      if (mounted) setSessionReady(true);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [utils]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: hasSession,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    setLogoutPending(true);
    try {
      await getSupabaseClient().auth.signOut({ scope: "local" });
      setHasSession(false);
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    } finally {
      setLogoutPending(false);
    }
  }, [utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: !sessionReady || logoutPending || (hasSession && meQuery.isLoading),
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [hasSession, logoutPending, meQuery.data, meQuery.error, meQuery.isLoading, sessionReady]
  );

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
