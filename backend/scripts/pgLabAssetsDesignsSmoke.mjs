import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";

if (process.env.NODE_ENV === "production" || Object.keys(process.env).some((key) => key.startsWith("RAILWAY_"))) {
  throw new Error("Refusing to run library/design tests in a production/Railway environment.");
}
process.env.NEON_LAB_MODE = "1";

const [{ createAssetRouter }, { createDesignRouter }, provider, cloudinaryConfig] = await Promise.all([
  import("../routes/assetRoutes.js"),
  import("../routes/designRoutes.js"),
  import("../config/databaseProvider.js"),
  import("../config/cloudinary.js"),
]);
const { getLabDatabasePool, getDatabaseProvider, assertLabTarget } = provider;
assertLabTarget();
assert.equal(getDatabaseProvider(), "postgres-lab");
const pool = getLabDatabasePool();
const { cloudinary } = cloudinaryConfig;
const originalUploadStream = cloudinary.uploader.upload_stream;
const originalDestroy = cloudinary.uploader.destroy;
const users = [randomUUID(), randomUUID()];
const userSet = new Set(users);
const assetIds = [];
const designIds = [];
const testRunId = randomUUID();
let uploadNumber = 0;
const mockedCloudinaryCalls = { uploads: 0, destroys: 0 };

// Replace Cloudinary I/O only inside this process. No request reaches Cloudinary.
cloudinary.uploader.upload_stream = (options, callback) => ({
  end(buffer) {
    mockedCloudinaryCalls.uploads += 1;
    const index = ++uploadNumber;
    callback(null, {
      secure_url: `https://images.example.invalid/lab/${testRunId}/${index}.png`,
      public_id: `lab-test/${testRunId}/${index}`,
      width: Math.max(1, buffer.length),
      height: 1,
      format: "png",
      bytes: buffer.length,
      folder: options.folder,
    });
  },
});
cloudinary.uploader.destroy = async () => {
  mockedCloudinaryCalls.destroys += 1;
  return { result: "ok" };
};

const identityMiddleware = (required) => (req, res, next) => {
  const id = req.get("x-mission-user");
  if (!id && !required) return next();
  if (!userSet.has(id)) return res.status(401).json({ message: "No autenticado." });
  req.user = { id, role: "user" };
  return next();
};
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api/assets", createAssetRouter({
  protect: identityMiddleware(true), optionalAuth: identityMiddleware(false),
}));
app.use("/api/designs", createDesignRouter({
  protect: identityMiddleware(true), optionalAuth: identityMiddleware(false),
}));

let server;
const baseUrl = await new Promise((resolve, reject) => {
  server = app.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  server.once("error", reject);
});
const request = (path, options = {}) => fetch(`${baseUrl}${path}`, {
  method: options.method || "GET",
  headers: {
    ...(options.userId ? { "x-mission-user": options.userId } : {}),
    ...(options.body instanceof FormData ? {} : options.body ? { "content-type": "application/json" } : {}),
  },
  ...(options.body ? { body: options.body instanceof FormData ? options.body : JSON.stringify(options.body) } : {}),
});
const uploadForm = (fields, fileBytes) => {
  const form = new FormData();
  form.append("image", new Blob([fileBytes], { type: "image/png" }), "synthetic.png");
  for (const [key, value] of Object.entries(fields)) form.append(key, typeof value === "string" ? value : JSON.stringify(value));
  return form;
};
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
    VALUES ($1, 'Library', 'Synthetic', $2, 'test-only'), ($3, 'Library', 'Synthetic', $4, 'test-only')
  `, [users[0], `lab-assets-${users[0]}@example.invalid`, users[1], `lab-assets-${users[1]}@example.invalid`]);

  // Confirm existing deny-anon RLS policies still hide the two source tables.
  const anon = await pool.connect();
  try {
    await anon.query("BEGIN");
    await anon.query("SET LOCAL ROLE anon");
    const [{ rows: assetRows }, { rows: designRows }] = await Promise.all([
      anon.query("SELECT count(*)::int AS n FROM public.design_assets"),
      anon.query("SELECT count(*)::int AS n FROM public.designs"),
    ]);
    assert.equal(assetRows[0].n, 0);
    assert.equal(designRows[0].n, 0);
    await anon.query("ROLLBACK");
  } finally {
    anon.release();
  }
  console.log("RLS: anon role sees zero assets and designs; existing policies unchanged");

  const assetBytes = Buffer.from(`synthetic-asset-${testRunId}`);
  const assetCreate = await request("/api/assets", {
    method: "POST", userId: users[0],
    body: uploadForm({ name: "Mission 3 synthetic asset", category: "general", subcategory: "mission-3",
      license: "lab-test", tags: "mission3,neon", formats: "png,svg", metadata: { origin: "test", dpi: 300 }, isPublic: true }, assetBytes),
  });
  assert.equal(assetCreate.status, 201);
  const createdAsset = (await assetCreate.json()).asset;
  assetIds.push(createdAsset.id);
  assert.equal(createdAsset.url, `https://images.example.invalid/lab/${testRunId}/1.png`);
  assert.deepEqual(createdAsset.tags, ["mission3", "neon"]);
  assert.deepEqual(createdAsset.formats, ["png", "svg"]);
  assert.deepEqual(createdAsset.metadata, { origin: "test", dpi: 300 });
  console.log("POST /api/assets: synthetic row persisted with Cloudinary URL/metadata (Cloudinary stubbed)");

  const duplicate = await request("/api/assets", {
    method: "POST", userId: users[0],
    body: uploadForm({ name: "Duplicate synthetic asset", category: "general" }, assetBytes),
  });
  assert.equal(duplicate.status, 409);
  assert.equal(mockedCloudinaryCalls.uploads, 1);
  console.log("POST /api/assets duplicate hash: 409; no second Cloudinary upload");

  const privateAssetCreate = await request("/api/assets", {
    method: "POST", userId: users[0],
    body: uploadForm({ name: "Mission 3 private synthetic asset", category: "general", isPublic: false }, Buffer.from(`private-${testRunId}`)),
  });
  assert.equal(privateAssetCreate.status, 201);
  const privateAsset = (await privateAssetCreate.json()).asset;
  assetIds.push(privateAsset.id);
  const privateAssetSearch = await request("/api/assets?search=Mission%203%20private%20synthetic%20asset");
  assert.equal((await privateAssetSearch.json()).pagination.total, 0);

  const pageOneResponse = await request("/api/assets?page=1&limit=1");
  assert.equal(pageOneResponse.status, 200);
  const pageOne = await pageOneResponse.json();
  assert.equal(pageOne.assets.length, 1);
  assert.equal(pageOne.pagination.page, 1);
  assert.equal(pageOne.pagination.limit, 1);
  assert.ok(pageOne.pagination.total >= 1);
  const pageTwoResponse = await request("/api/assets?page=2&limit=1");
  assert.equal(pageTwoResponse.status, 200);
  assert.notEqual((await pageTwoResponse.json()).assets[0]?.id, pageOne.assets[0].id);
  console.log("GET /api/assets: pagination shape and offsets passed");

  for (const query of [
    "category=general&subcategory=mission-3&license=lab-test",
    "tags=mission3,neon",
    "search=Mission%203%20synthetic%20asset",
  ]) {
    const response = await request(`/api/assets?${query}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(body.assets.some((asset) => asset.id === createdAsset.id));
  }
  console.log("GET /api/assets filters: category/subcategory/license, overlapping tags and name search passed");

  const categoriesResponse = await request("/api/assets/categories");
  assert.equal(categoriesResponse.status, 200);
  const { categories } = await categoriesResponse.json();
  const general = categories.find((category) => category.value === "general");
  assert.ok(general.count >= 1);
  assert.equal(general.subcategories.find((subcategory) => subcategory.value === "mission-3")?.count, 1);
  console.log("GET /api/assets/categories: known categories and subcategory counts passed");

  const assetDetail = await request(`/api/assets/${createdAsset.id}`);
  assert.equal(assetDetail.status, 200);
  assert.equal((await assetDetail.json()).asset.url, createdAsset.url);
  assert.equal((await request(`/api/assets/${privateAsset.id}`)).status, 404);
  assert.equal((await request(`/api/assets/${privateAsset.id}`, { userId: users[0] })).status, 200);
  assert.equal((await request(`/api/assets/${createdAsset.id}`, { method: "DELETE", userId: users[1] })).status, 403);
  const assetDelete = await request(`/api/assets/${createdAsset.id}`, { method: "DELETE", userId: users[0] });
  assert.equal(assetDelete.status, 200);
  assetIds.splice(assetIds.indexOf(createdAsset.id), 1);
  console.log("GET /api/assets/:id: public/private owner visibility passed; unauthorized asset deletion denied");

  const publicDesignCreate = await request("/api/designs", {
    method: "POST", userId: users[0],
    body: uploadForm({ title: "Mission 3 public design", description: "Synthetic approved gallery record",
      tags: "mission3,community", category: "cyberpunk", isPublic: true }, Buffer.from(`design-public-${testRunId}`)),
  });
  assert.equal(publicDesignCreate.status, 201);
  const publicDesign = (await publicDesignCreate.json()).design;
  designIds.push(publicDesign.id);
  await pool.query("UPDATE public.designs SET status = 'approved' WHERE id = $1", [publicDesign.id]);

  const privateDesignCreate = await request("/api/designs", {
    method: "POST", userId: users[0],
    body: uploadForm({ title: "Mission 3 private design", description: "Synthetic private design",
      tags: "mission3,private", category: "minimalista", isPublic: false }, Buffer.from(`design-private-${testRunId}`)),
  });
  assert.equal(privateDesignCreate.status, 201);
  const privateDesign = (await privateDesignCreate.json()).design;
  designIds.push(privateDesign.id);

  const galleryResponse = await request("/api/designs?page=1&limit=1&category=cyberpunk&tags=mission3,community");
  assert.equal(galleryResponse.status, 200);
  const gallery = await galleryResponse.json();
  assert.ok(gallery.designs.some((design) => design.id === publicDesign.id));
  assert.equal(gallery.pagination.limit, 1);
  assert.ok(gallery.designs.every((design) => design.is_public === undefined && design.owner));
  const unfilteredPublic = await request("/api/designs?tags=mission3");
  const publicBody = await unfilteredPublic.json();
  assert.ok(publicBody.designs.some((design) => design.id === publicDesign.id));
  assert.ok(!publicBody.designs.some((design) => design.id === privateDesign.id));
  console.log("GET /api/designs: pagination, category/tags filters, owner projection and public/approved visibility passed");

  const publicDetail = await request(`/api/designs/${publicDesign.id}`);
  assert.equal(publicDetail.status, 200);
  const { design: detail } = await publicDetail.json();
  assert.equal(detail.image_url, publicDesign.image_url);
  assert.equal(detail.owner.id, users[0]);
  assert.equal((await request(`/api/designs/${privateDesign.id}`)).status, 403);
  assert.equal((await request(`/api/designs/${privateDesign.id}`, { userId: users[0] })).status, 200);
  console.log("GET /api/designs/:id: public retrieval and private owner restriction passed");

  const mineResponse = await request("/api/designs/mine?page=1&limit=10", { userId: users[0] });
  assert.equal(mineResponse.status, 200);
  const mine = await mineResponse.json();
  assert.ok(mine.designs.some((design) => design.id === privateDesign.id));
  assert.ok(mine.designs.some((design) => design.id === publicDesign.id));
  assert.ok(!(await (await request("/api/designs/mine", { userId: users[1] })).json()).designs.some((design) => design.id === privateDesign.id));

  const updateResponse = await request(`/api/designs/${privateDesign.id}`, {
    method: "PUT", userId: users[0], body: { title: "Mission 3 private design updated", tags: ["updated", "mission3"] },
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).design.title, "Mission 3 private design updated");
  assert.equal((await request(`/api/designs/${privateDesign.id}`, { method: "PUT", userId: users[1], body: { title: "forbidden" } })).status, 403);
  const likeResponse = await request(`/api/designs/${publicDesign.id}/like`, { method: "POST" });
  assert.equal(likeResponse.status, 200);
  assert.equal((await likeResponse.json()).likes, 1);
  console.log("GET /api/designs/mine, owner-only PUT and atomic likes passed");

  const destroyResponse = await request(`/api/designs/${privateDesign.id}`, { method: "DELETE", userId: users[1] });
  assert.equal(destroyResponse.status, 403);
  const designDelete = await request(`/api/designs/${privateDesign.id}`, { method: "DELETE", userId: users[0] });
  assert.equal(designDelete.status, 200);
  designIds.splice(designIds.indexOf(privateDesign.id), 1);
  console.log("DELETE /api/designs/:id: non-owner denied; owner can delete (Cloudinary destroy stubbed)");

  assert.equal(mockedCloudinaryCalls.uploads, 4);
  assert.equal(mockedCloudinaryCalls.destroys, 2);
  console.log("Cloudinary calls: all upload/destroy operations were intercepted locally; no remote file changed");

  await pool.query("DELETE FROM public.design_assets WHERE id = ANY($1::uuid[])", [assetIds]);
  assetIds.length = 0;
  await pool.query("DELETE FROM public.designs WHERE id = ANY($1::uuid[])", [designIds]);
  designIds.length = 0;
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [users]);
  const final = await counts();
  assert.deepEqual(final, initial);
  console.log(`original counts restored: ${JSON.stringify(final)}`);
} catch (error) {
  console.error("asset/design lab test failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.query("DELETE FROM public.design_assets WHERE public_id LIKE $1", [`lab-test/${testRunId}/%`]).catch(() => {});
  await pool.query("DELETE FROM public.designs WHERE owner_id = ANY($1::uuid[])", [users]).catch(() => {});
  if (assetIds.length) await pool.query("DELETE FROM public.design_assets WHERE id = ANY($1::uuid[])", [assetIds]).catch(() => {});
  if (designIds.length) await pool.query("DELETE FROM public.designs WHERE id = ANY($1::uuid[])", [designIds]).catch(() => {});
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [users]).catch(() => {});
  cloudinary.uploader.upload_stream = originalUploadStream;
  cloudinary.uploader.destroy = originalDestroy;
  if (server) await new Promise((resolve) => server.close(resolve));
  await provider.closeLabDatabasePool();
}
