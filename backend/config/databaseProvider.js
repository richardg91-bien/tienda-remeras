import { createLabPostgresPool, LAB_TARGET } from "./labPostgresPool.js";

export function isLabPostgresEnabled(env = process.env) {
  return env.NEON_LAB_MODE === "1"
    && env.NODE_ENV !== "production"
    && !Object.keys(env).some((key) => key.startsWith("RAILWAY_"));
}

let labPool;

export function getDatabaseProvider() {
  return isLabPostgresEnabled() ? "postgres-lab" : "supabase";
}

export function getLabDatabasePool() {
  if (!isLabPostgresEnabled()) {
    throw new Error("PostgreSQL lab provider is disabled outside the explicit local lab mode.");
  }
  assertLabTarget();
  if (!labPool) labPool = createLabPostgresPool();
  return labPool;
}

export async function closeLabDatabasePool() {
  if (!labPool) return;
  const pool = labPool;
  labPool = undefined;
  await pool.end();
}

export function assertLabTarget() {
  if (LAB_TARGET.host !== "127.0.0.1" || LAB_TARGET.port !== 55432
      || LAB_TARGET.database !== "tienda_remeras_app_lab") {
    throw new Error("The lab PostgreSQL target must remain fixed to the local container.");
  }
}
