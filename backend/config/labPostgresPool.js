import { createPostgresPool } from "./postgresPool.js";

const LAB_TARGET = Object.freeze({
  host: "127.0.0.1",
  port: 55432,
  database: "tienda_remeras_app_lab",
  user: "lab_admin",
});

/** Connect only to the explicitly provided local laboratory container. */
export function createLabPostgresPool() {
  const password = process.env.NEON_LAB_PASSWORD;
  return createPostgresPool({
    ...LAB_TARGET,
    ...(password ? { password } : {}),
    ssl: false,
    max: 1,
    connectionTimeoutMillis: 5_000,
    application_name: "neon-stitch-lab-test",
  });
}

export { LAB_TARGET };
