import { createClient } from "@supabase/supabase-js";

function websocketTransport(): unknown {
  if (typeof WebSocket !== "undefined") {
    return WebSocket;
  }
  try {
    // Node 20 has no global WebSocket; scripts and Next server need `ws`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("ws");
  } catch {
    return undefined;
  }
}

export function createServiceSupabase(url: string, key: string) {
  const transport = websocketTransport();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        "X-Client-Info": "crisis-sim/server",
      },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("User-Agent", "crisis-sim/1.0");
        return fetch(input, { ...init, headers });
      },
    },
    ...(transport
      ? { realtime: { transport: transport as typeof WebSocket } }
      : {}),
  });
}
