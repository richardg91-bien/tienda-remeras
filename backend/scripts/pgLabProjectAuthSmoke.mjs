import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production" || Object.keys(process.env).some((key) => key.startsWith("RAILWAY_"))) {
  throw new Error("Refusing to run authenticated project tests in a production/Railway environment.");
}
process.env.NEON_LAB_MODE = "1";
process.env.JWT_SECRET = "synthetic-project-auth-secret-for-local-tests-only";

const identities = [randomUUID(), randomUUID()];
const mockUsers = new Map(identities.map((id, index) => [id, {
  id,
  first_name: "Synthetic",
  last_name: `Customer ${index + 1}`,
  email: `project-auth-${id}@example.invalid`,
  role: "user",
  is_verified: false,
  avatar_url: "",
  bio: "",
  address: {},
  created_at: new Date(0).toISOString(),
}]));
const authService = express();
authService.all("/rest/v1/users", (req, res) => {
  if (req.method === "HEAD") return res.set("content-range", "0-0/0").status(200).end();
  const filter = String(req.query.id || "");
  const id = filter.startsWith("eq.") ? filter.slice(3) : "";
  const user = mockUsers.get(id);
  if (!user) return res.status(200).json([]);
  if (req.get("accept")?.includes("vnd.pgrst.object+json")) return res.json(user);
  return res.json([user]);
});

let authServer;
let apiServer;
const authUrl = await new Promise((resolve, reject) => {
  authServer = authService.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${authServer.address().port}`));
  authServer.once("error", reject);
});
process.env.SUPABASE_URL = authUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-local-test-key";

const pool = (await import("../config/databaseProvider.js")).getLabDatabasePool();
const app = express();
app.use(express.json({ limit: "1mb" }));
const { protect } = await import("../middleware/auth.js");
const { createProjectRouter } = await import("../routes/projectRoutes.js");
app.use("/api/projects", createProjectRouter(protect));
const apiUrl = await new Promise((resolve, reject) => {
  apiServer = app.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${apiServer.address().port}`));
  apiServer.once("error", reject);
});
const accessTokens = identities.map((id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "5m" }));
const request = (path, { token, method = "GET", body } = {}) => fetch(`${apiUrl}${path}`, {
  method,
  headers: {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(body ? { "content-type": "application/json" } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

try {
  await pool.query(`
    INSERT INTO public.users (id, first_name, last_name, email, password_hash)
    VALUES ($1, 'Synthetic', 'Customer A', $2, 'test-only'), ($3, 'Synthetic', 'Customer B', $4, 'test-only')
  `, [identities[0], mockUsers.get(identities[0]).email, identities[1], mockUsers.get(identities[1]).email]);

  assert.equal((await request("/api/projects")).status, 401);
  assert.equal((await request("/api/projects", { token: "invalid.jwt.token" })).status, 401);
  const body = {
    name: "JWT isolated project",
    productRef: "tee-classic",
    productCategory: "textil",
    variant: { size: "M", color: "Negro", surfaceId: "front" },
    canvas: { surfaces: { front: { width: 450, height: 600, objects: [] } } },
    owner_id: identities[1],
  };
  const createdResponse = await request("/api/projects", { token: accessTokens[0], method: "POST", body });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).project;
  assert.equal(created.variant.size, "M");
  assert.equal(created.production.productRef, "tee-classic");
  assert.equal(Object.hasOwn(created, "owner_id"), false);
  assert.equal((await request(`/api/projects/${created.id}`, { token: accessTokens[1] })).status, 404);

  const updatedResponse = await request(`/api/projects/${created.id}`, {
    token: accessTokens[0], method: "PUT", body: { ...body, name: "JWT isolated project updated", owner_id: identities[1] },
  });
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).project.name, "JWT isolated project updated");
  assert.equal((await request(`/api/projects/${created.id}`, { token: accessTokens[1], method: "PUT", body: { name: "foreign update" } })).status, 404);
  const ownerRead = await request(`/api/projects/${created.id}`, { token: accessTokens[0] });
  assert.equal((await ownerRead.json()).project.name, "JWT isolated project updated");
  assert.equal((await request(`/api/projects/${created.id}`, { token: accessTokens[0], method: "DELETE" })).status, 200);

  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [identities]);
  const { rows: remaining } = await pool.query("SELECT count(*)::int AS count FROM public.users WHERE id = ANY($1::uuid[])", [identities]);
  assert.equal(remaining[0].count, 0);
  console.log("actual JWT middleware + local Supabase Auth lookup + local PostgreSQL: bearer auth and project owner isolation passed");
} finally {
  await pool.query("DELETE FROM public.design_projects WHERE owner_id = ANY($1::uuid[])", [identities]).catch(() => {});
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [identities]).catch(() => {});
  await (await import("../config/databaseProvider.js")).closeLabDatabasePool();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  if (authServer) await new Promise((resolve) => authServer.close(resolve));
}
