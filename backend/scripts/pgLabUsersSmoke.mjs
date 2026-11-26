import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";

if (process.env.NODE_ENV === "production" || Object.keys(process.env).some((key) => key.startsWith("RAILWAY_"))) {
  throw new Error("Refusing to run profile tests in a production/Railway environment.");
}
process.env.NEON_LAB_MODE = "1";

const [{ createUserRouter }, provider] = await Promise.all([
  import("../routes/userRoutes.js"),
  import("../config/databaseProvider.js"),
]);
const { getLabDatabasePool, getDatabaseProvider, assertLabTarget, closeLabDatabasePool } = provider;
assertLabTarget();
assert.equal(getDatabaseProvider(), "postgres-lab");
const pool = getLabDatabasePool();
const userIds = [randomUUID(), randomUUID()];
const missingProfileId = randomUUID();
const invalidSessionId = randomUUID();
const identityRoles = new Map([[userIds[0], "user"], [userIds[1], "admin"], [missingProfileId, "user"]]);
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api/users", createUserRouter((req, res, next) => {
  const identity = req.get("x-lab-identity");
  const role = identityRoles.get(identity);
  if (!role) return res.status(401).json({ message: "No autenticado." });
  req.user = { id: identity, role };
  return next();
}));

let server;
const baseUrl = await new Promise((resolve, reject) => {
  server = app.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  server.once("error", reject);
});
const request = (identity, { method = "GET", body } = {}) => fetch(`${baseUrl}/api/users/profile`, {
  method,
  headers: {
    ...(identity ? { "x-lab-identity": identity } : {}),
    ...(body ? { "content-type": "application/json" } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const counts = async () => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM public.users) AS users,
      (SELECT count(*)::int FROM public.design_assets) AS assets,
      (SELECT count(*)::int FROM public.designs) AS designs,
      (SELECT count(*)::int FROM public.orders) AS orders,
      (SELECT count(*)::int FROM public.design_projects) AS projects
  `);
  return rows[0];
};

try {
  const initial = await counts();
  await pool.query(`
    INSERT INTO public.users (id, first_name, last_name, email, password_hash, role, phone, bio, address)
    VALUES
      ($1, 'Synthetic', 'Customer', $2, 'test-only', 'user', '5550001', 'lab profile', '{"city":"City A","country":"Argentina"}'::jsonb),
      ($3, 'Synthetic', 'Administrator', $4, 'test-only', 'admin', '5550002', 'lab admin profile', '{"city":"City B","country":"Argentina"}'::jsonb)
  `, [userIds[0], `lab-profile-${userIds[0]}@example.invalid`, userIds[1], `lab-profile-${userIds[1]}@example.invalid`]);

  // Existing deny-anon RLS is checked without changing grants or policies.
  const anon = await pool.connect();
  try {
    await anon.query("BEGIN");
    await anon.query("SET LOCAL ROLE anon");
    const { rows } = await anon.query("SELECT count(*)::int AS n FROM public.users");
    assert.equal(rows[0].n, 0);
    await anon.query("ROLLBACK");
  } finally {
    anon.release();
  }

  assert.equal((await request(null)).status, 401);
  assert.equal((await request(invalidSessionId)).status, 401);
  console.log("Authentication boundary: missing/unknown lab identity rejected (test middleware only; no JWT was validated)");

  const firstResponse = await request(userIds[0]);
  assert.equal(firstResponse.status, 200);
  const first = (await firstResponse.json()).user;
  assert.equal(first.id, userIds[0]);
  assert.equal(first.role, "user");
  assert.equal(first.first_name, "Synthetic");
  assert.equal(Object.hasOwn(first, "password_hash"), false);
  assert.equal(Object.hasOwn(first, "refresh_token"), false);
  const adminResponse = await request(userIds[1]);
  assert.equal(adminResponse.status, 200);
  const admin = (await adminResponse.json()).user;
  assert.equal(admin.id, userIds[1]);
  assert.equal(admin.role, "admin");
  console.log("GET /api/users/profile: stable IDs and existing user/admin roles returned; sensitive fields absent");

  const updateResponse = await request(userIds[0], {
    method: "PUT",
    body: {
      firstName: "Updated Synthetic",
      address: { city: "Updated City" },
      id: userIds[1],
      role: "admin",
      email: "attacker@example.invalid",
      password_hash: "ignored-test-value",
      refresh_token: "ignored-test-value",
    },
  });
  assert.equal(updateResponse.status, 200);
  const updated = (await updateResponse.json()).user;
  assert.equal(updated.id, userIds[0]);
  assert.equal(updated.first_name, "Updated Synthetic");
  assert.equal(updated.address.city, "Updated City");
  assert.equal(updated.address.country, "Argentina");
  assert.equal(updated.role, "user");
  assert.equal(updated.email, `lab-profile-${userIds[0]}@example.invalid`);
  assert.equal(Object.hasOwn(updated, "password_hash"), false);
  assert.equal(Object.hasOwn(updated, "refresh_token"), false);

  const adminAfterUpdate = (await (await request(userIds[1])).json()).user;
  assert.equal(adminAfterUpdate.first_name, "Synthetic");
  assert.equal(adminAfterUpdate.role, "admin");
  console.log("PUT /api/users/profile: authenticated owner only; address merged; role/email/ID spoofing ignored");

  const missingProfileResponse = await request(missingProfileId);
  assert.equal(missingProfileResponse.status, 500);
  assert.deepEqual(await missingProfileResponse.json(), { message: "Error obteniendo perfil." });
  console.log("Missing profile: generic legacy-compatible error; no profile data returned");

  const after = await counts();
  assert.deepEqual(after, { ...initial, users: initial.users + 2 });
  console.log("RLS: anon cannot list users; only two synthetic profiles were added for this check");
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [userIds]);
  const final = await counts();
  assert.deepEqual(final, initial);
  console.log(`original counts restored: ${JSON.stringify(final)}`);
} catch (error) {
  console.error("profile lab test failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [userIds]).catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeLabDatabasePool();
}
