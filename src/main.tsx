import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getSupabaseClient } from "./lib/supabase";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Query Error]", event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiBaseUrl}/api/trpc`,
      transformer: superjson,
      async headers() {
        try {
          const {
            data: { session },
          } = await getSupabaseClient().auth.getSession();
          return session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {};
        } catch {
          return {};
        }
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          // Authentication is explicit via the Supabase bearer token. No
          // cross-site Render cookies are used or shared with GitHub Pages.
          credentials: "omit",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
