import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";

if (process.env.NODE_ENV === "production" || Object.keys(process.env).some((key) => key.startsWith("RAILWAY_"))) {
  throw new Error("Refusing to run route tests in a production/Railway environment.");
}
process.env.NEON_LAB_MODE = "1";

const [{ createProjectRouter }, { default: productRoutes }, provider] = await Promise.all([
  import("../routes/projectRoutes.js"),
  import("../routes/productModelRoutes.js"),
  import("../config/databaseProvider.js"),
]);
const { getLabDatabasePool, getDatabaseProvider, assertLabTarget, isLabPostgresEnabled } = provider;
assertLabTarget();
assert.equal(getDatabaseProvider(), "postgres-lab");
assert.equal(isLabPostgresEnabled({ NEON_LAB_MODE: "1", NODE_ENV: "production" }), false);
assert.equal(isLabPostgresEnabled({ NEON_LAB_MODE: "1", RAILWAY_ENVIRONMENT_NAME: "production" }), false);
assert.equal(isLabPostgresEnabled({}), false);

const pool = getLabDatabasePool();
const userIds = [randomUUID(), randomUUID()];
const testUserIds = new Set(userIds);
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api/projects", createProjectRouter((req, res, next) => {
  const userId = req.get("x-lab-user-id");
  if (!testUserIds.has(userId)) return res.status(401).json({ message: "No autenticado." });
  req.user = { id: userId };
  return next();
}));
app.use("/api/products", productRoutes);

let server;
let projectId;
const baseUrl = await new Promise((resolve, reject) => {
  server = app.listen(0, "127.0.0.1", () => {
    const address = server.address();
    resolve(`http://127.0.0.1:${address.port}`);
  });
  server.once("error", reject);
});

const request = async (path, { userId, method = "GET", body } = {}) => fetch(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(userId ? { "x-lab-user-id": userId } : {}),
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
    INSERT INTO public.users (id, first_name, last_name, email, password_hash)
    VALUES ($1, 'Route', 'Synthetic', $2, 'test-only'), ($3, 'Route', 'Synthetic', $4, 'test-only')
  `, [userIds[0], `lab-route-${userIds[0]}@example.invalid`, userIds[1], `lab-route-${userIds[1]}@example.invalid`]);

  const modelsResponse = await request("/api/products/models");
  assert.equal(modelsResponse.status, 200);
  const { models } = await modelsResponse.json();
  assert.equal(models.length, 6);
  for (const model of models) {
    assert.ok(model.id && model.category && model.name);
    assert.ok(model.variant_schema && Array.isArray(model.print_surfaces));
    assert.ok(model.production_template);
    assert.ok(model.print_surfaces.length > 0);
    assert.ok(model.print_surfaces.every((surface) => surface.id && surface.label
      && [surface.widthMm, surface.heightMm, surface.diameterMm].some(Number.isFinite)));
  }
  console.log("GET /api/products/models: 200; six models and millimeter surfaces");

  const modelResponse = await request("/api/products/models/tee-classic");
  assert.equal(modelResponse.status, 200);
  const { model } = await modelResponse.json();
  assert.equal(model.id, "tee-classic");
  assert.ok(model.print_surfaces.some((surface) => surface.widthMm === 300 && surface.heightMm === 400));
  assert.equal((await request("/api/products/models/not-a-model")).status, 404);
  console.log("GET /api/products/models/:id: 200 for model; 404 for unknown ID");

  assert.equal((await request("/api/projects")).status, 401);
  const projectPayload = {
    name: "Synthetic route project",
    productRef: "mug-standard",
    productCategory: "sublimacion",
    variant: { capacityMl: 350 },
    canvas: { surfaces: { wrap: { objects: [], widthMm: 200, heightMm: 90 } } },
    previewUrl: "",
    production: { resolutionDpi: 300 },
    owner_id: userIds[1],
  };
  const createResponse = await request("/api/projects", { method: "POST", userId: userIds[0], body: projectPayload });
  assert.equal(createResponse.status, 201);
  let created = (await createResponse.json()).project;
  projectId = created.id;
  assert.ok(projectId);
  assert.equal(created.product_ref, "mug-standard");
  assert.deepEqual(created.variant, projectPayload.variant);
  assert.deepEqual(created.canvas, projectPayload.canvas);
  assert.equal(Object.hasOwn(created, "owner_id"), false);
  console.log("POST /api/projects: 201; payload preserved; client owner_id ignored");

  const getResponse = await request(`/api/projects/${projectId}`, { userId: userIds[0] });
  assert.equal(getResponse.status, 200);
  assert.equal((await getResponse.json()).project.id, projectId);
  const listResponse = await request("/api/projects", { userId: userIds[0] });
  assert.equal(listResponse.status, 200);
  assert.ok((await listResponse.json()).projects.some((item) => item.id === projectId));
  console.log("GET /api/projects/:id and GET /api/projects: owner recovery/list passed");

  const updatePayload = { ...projectPayload, name: "Synthetic route project updated", owner_id: userIds[1] };
  const updateResponse = await request(`/api/projects/${projectId}`, { method: "PUT", userId: userIds[0], body: updatePayload });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).project.name, updatePayload.name);

  assert.equal((await request(`/api/projects/${projectId}`, { userId: userIds[1] })).status, 404);
  assert.equal((await request(`/api/projects/${projectId}`, { method: "PUT", userId: userIds[1], body: { name: "unauthorized" } })).status, 404);
  assert.equal((await request(`/api/projects/${projectId}`, { method: "DELETE", userId: userIds[1] })).status, 404);
  const ownerAfterDenials = await request(`/api/projects/${projectId}`, { userId: userIds[0] });
  assert.equal((await ownerAfterDenials.json()).project.name, updatePayload.name);
  console.log("PUT owner passed; foreign GET/PUT/DELETE return 404 and cannot alter project");

  const deleteResponse = await request(`/api/projects/${projectId}`, { method: "DELETE", userId: userIds[0] });
  assert.equal(deleteResponse.status, 200);
  assert.equal((await deleteResponse.json()).deleted, true);
  projectId = undefined;
  assert.equal((await request(`/api/projects/${created.id}`, { userId: userIds[0] })).status, 404);
  console.log("DELETE owner passed; project no longer recoverable");

  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [userIds]);
  const final = await counts();
  assert.deepEqual(final, initial);
  console.log(`baseline restored: ${JSON.stringify(final)}`);
} catch (error) {
  console.error("lab route test failed:", error.message);
  process.exitCode = 1;
} finally {
  if (projectId) {
    await pool.query("DELETE FROM public.design_projects WHERE id = $1", [projectId]).catch(() => {});
  }
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [userIds]).catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
  await (await import("../config/databaseProvider.js")).closeLabDatabasePool();
}
