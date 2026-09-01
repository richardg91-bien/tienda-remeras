import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error("❌ Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

/**
 * Cliente con service_role key — bypasea RLS.
 * Realtime deshabilitado — no se usa en este backend
 * y requiere WebSocket nativo (Node 22+).
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
  },
  // Deshabilita completamente el cliente Realtime
  // Evita el error "native WebSocket not found" en Node 20
  realtime: {
    params: { eventsPerSecond: -1 },
  },
  global: {
    headers: { "x-application-name": "neon-stitch-api" },
  },
});

// Parcha el WebSocket para evitar el error en Node 20
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class FakeWS {
    constructor() { this.readyState = 3; }
    close() {}
    send() {}
  };
}

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
