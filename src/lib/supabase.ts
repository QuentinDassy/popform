import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

// Wrap fetch with a 10s timeout so ALL Supabase requests fail fast
// instead of hanging indefinitely after network inactivity
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: fetchWithTimeout } }
    );
  }
  return client;
}
