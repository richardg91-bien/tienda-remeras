import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const base = process.env.WORKER_TEST_URL || "http://127.0.0.1:8787";
const testDir = resolve(process.env.WORKER_TEST_DATA_DIR || ".wrangler/phase1c-test-data");
const manifestPath = resolve(testDir, "manifest.json");
const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkAAAAAASUVORK5CYII=", "base64");

async function expectJson(response, status) {
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}

async function authRequest(path, token, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${base}${path}`, { ...options, headers });
}

const health = await expectJson(await fetch(`${base}/health`), 200);
assert.equal(health.persistence, "d1+r2");

const cors = await fetch(`${base}/api/projects`, {
  method: "OPTIONS",
  headers: { origin: "http://localhost:5173", "access-control-request-method": "POST" },
});
assert.equal(cors.status, 204);
assert.equal(cors.headers.get("access-control-allow-origin"), "http://localhost:5173");
assert.equal(cors.headers.get("access-control-allow-credentials"), "true");

const models = await expectJson(await fetch(`${base}/api/products/models`), 200);
const model = models.models.find((entry) => entry.id === "tee-classic");
assert.ok(model);
assert.deepEqual(model.print_surfaces.map(({ id }) => id), ["front", "back"]);

const runId = randomUUID();
const draftId = randomUUID();
const users = [
  { firstName: "Worker", lastName: "Owner", email: `phase1c-${runId}@example.invalid`, password: "Local-Worker-48291" },
  { firstName: "Worker", lastName: "Other", email: `phase1c-other-${runId}@example.invalid`, password: "Local-Worker-58291" },
];
const registrations = await Promise.all(users.map(async (user) => {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(user),
  });
  const data = await expectJson(response, 201);
  assert.match(response.headers.get("set-cookie") || "", /HttpOnly/i);
  assert.match(response.headers.get("set-cookie") || "", /SameSite=Lax/i);
  assert.ok(data.accessToken);
  return { ...user, id: data.user.id, token: data.accessToken, cookie: response.headers.get("set-cookie").split(";")[0] };
}));
const [owner, other] = registrations;

const projectBody = {
  id: randomUUID(),
  draftId,
  owner_id: other.id,
  name: "Remera persistente Fase 1C",
  productRef: "tee-classic",
  productCategory: "textil",
  variant: { catalogProductId: "4", size: "L", color: "#0486D7", surfaceId: "front" },
  canvas: {
    version: "7.4.0",
    width: 450,
    height: 600,
    products: { "tee-classic": { surfaces: {
      front: { version: "7.4.0", width: 450, height: 600, objects: [{ type: "textbox", text: "Frente inicial" }] },
      back: { version: "7.4.0", width: 450, height: 600, objects: [{ type: "textbox", text: "Espalda inicial" }] },
    } } },
  },
  production: { source: "local-integration-test" },
};
const createResult = await expectJson(await authRequest("/api/projects", owner.token, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(projectBody),
}), 201);
const project = createResult.project;
assert.equal(project.id, draftId);
assert.equal(project.product_ref, "tee-classic");
assert.deepEqual(project.variant, projectBody.variant);
assert.equal(project.production.products["tee-classic"].surfaces.front.widthPx, 3543);
assert.equal(project.production.products["tee-classic"].surfaces.back.heightPx, 4724);
assert.equal(Object.hasOwn(project, "owner_id"), false);

const form = new FormData();
form.append("projectId", project.id);
form.append("image", new Blob([pngBytes], { type: "image/png" }), "private-mark.png");
const uploaded = (await expectJson(await authRequest("/api/private-assets", owner.token, { method: "POST", body: form }), 201)).asset;
assert.ok(uploaded.path.startsWith(`${owner.id}/${project.id}/`));
assert.equal(uploaded.expiresIn, 300);

const firstCanvas = project.canvas.products["tee-classic"].surfaces.front;
firstCanvas.objects.push({
  type: "image",
  privateAssetPath: uploaded.path,
  src: `private-asset:${uploaded.path}`,
});
project.canvas.products["tee-classic"].surfaces.back.objects.push({ type: "textbox", text: "Dorso actualizado" });
const updateBody = {
  ...projectBody,
  id: randomUUID(),
  draftId: randomUUID(),
  name: "Remera guardada con imagen privada",
  canvas: project.canvas,
};
const updated = (await expectJson(await authRequest(`/api/projects/${project.id}`, owner.token, {
  method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(updateBody),
}), 200)).project;
assert.equal(updated.id, project.id, "PUT must update only the URL ID");
assert.equal(updated.name, updateBody.name);
assert.equal(updated.variant.catalogProductId, "4");
assert.equal(updated.variant.size, "L");
assert.equal(updated.variant.color, "#0486D7");
assert.equal(updated.canvas.products["tee-classic"].surfaces.front.objects[1].privateAssetPath, uploaded.path);
assert.equal(updated.canvas.products["tee-classic"].surfaces.back.objects[1].text, "Dorso actualizado");

const listed = (await expectJson(await authRequest("/api/projects", owner.token), 200)).projects;
assert.equal(listed.length, 1);
assert.equal(listed[0].id, project.id);
assert.deepEqual((await expectJson(await authRequest(`/api/projects/${project.id}`, owner.token), 200)).project.canvas, updated.canvas);
assert.deepEqual((await expectJson(await authRequest("/api/projects", other.token), 200)).projects, []);
assert.equal((await authRequest(`/api/projects/${project.id}`, other.token)).status, 404);
assert.equal((await authRequest(`/api/projects/${project.id}`, other.token, {
  method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "foreign edit" }),
})).status, 404);
assert.equal((await authRequest(`/api/projects/${project.id}`, other.token, { method: "DELETE" })).status, 404);

const privateParams = new URLSearchParams({ path: uploaded.path });
assert.equal((await authRequest(`/api/private-assets/file?${privateParams}`, other.token)).status, 403);
const listedAssets = (await expectJson(await authRequest(`/api/private-assets?projectId=${project.id}`, owner.token), 200)).assets;
assert.equal(listedAssets.length, 1);
assert.equal(listedAssets[0].path, uploaded.path);
assert.equal(listedAssets[0].expiresIn, 300);
const renewed = (await expectJson(await authRequest(`/api/private-assets/file?${privateParams}`, owner.token), 200));
assert.equal(renewed.expiresIn, 300);
const downloaded = await fetch(renewed.url);
assert.equal(downloaded.status, 200);
assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), pngBytes);
const tampered = new URL(renewed.url);
tampered.searchParams.set("path", `${other.id}/${project.id}/${uploaded.path.split("/").at(-1)}`);
assert.equal((await fetch(tampered)).status, 403);

const refreshResponse = await fetch(`${base}/api/auth/refresh`, {
  method: "POST", headers: { cookie: owner.cookie },
});
const refreshData = await expectJson(refreshResponse, 200);
assert.ok(refreshData.accessToken);
const rotatedCookie = refreshResponse.headers.get("set-cookie").split(";")[0];
assert.equal((await fetch(`${base}/api/auth/refresh`, { method: "POST", headers: { cookie: owner.cookie } })).status, 401);
assert.equal((await authRequest("/api/auth/me", refreshData.accessToken)).status, 200);

await mkdir(dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, JSON.stringify({
  owner: { email: owner.email, password: owner.password, id: owner.id },
  other: { email: other.email, password: other.password, id: other.id },
  projectId: project.id,
  assetPath: uploaded.path,
  rotatedRefreshCookie: rotatedCookie,
}, null, 2));

console.log("LOCAL D1/R2 phase: register/login, create, upload, list, reopen, update, private retrieval and signed-URL renewal passed");
console.log("JWT owner boundary: foreign list empty; foreign project read/update/delete and asset-sign requests denied");
console.log("Restart phase manifest saved locally; the wrapper restarts workerd before the persistence check.");
