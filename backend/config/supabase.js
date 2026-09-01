// Polyfill WebSocket para Node.js < 22 (Railway usa Node 20)
// Debe ir ANTES de cualquier import de @supabase
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 3; // CLOSED
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSING = 2;
      this.CLOSED = 3;
    }
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error("❌ Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
  },
});

// Verifica la conexión al iniciar
supabase
  .from("users")
  .select("count", { count: "exact", head: true })
  .then(({ error }) => {
    if (error) {
      console.error("❌ Error conectando a Supabase:", error.message);
    } else {
      console.log("✅ Supabase conectado correctamente");
    }
  });

export default supabase;
