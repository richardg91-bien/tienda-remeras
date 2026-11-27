import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.WORKER_TEST_URL || "http://127.0.0.1:8787";
const manifestPath = resolve(process.env.WORKER_TEST_DATA_DIR || ".wrangler/phase1c-test-data", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

async function expectJson(response, status) {
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}

const login = await expectJson(await fetch(`${base}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: manifest.owner.email, password: manifest.owner.password }),
}), 200);
const token = login.accessToken;
const auth = (path, options = {}) => fetch(`${base}${path}`, {
  ...options,
  headers: { ...(options.headers || {}), authorization: `Bearer ${token}` },
});

const listed = (await expectJson(await auth("/api/projects"), 200)).projects;
assert.ok(listed.some((project) => project.id === manifest.projectId));
const opened = (await expectJson(await auth(`/api/projects/${manifest.projectId}`), 200)).project;
assert.equal(opened.product_ref, "tee-classic");
assert.equal(opened.variant.catalogProductId, "4");
assert.equal(opened.variant.size, "L");
assert.equal(opened.variant.color, "#0486D7");
assert.equal(opened.canvas.products["tee-classic"].surfaces.front.objects[1].privateAssetPath, manifest.assetPath);
assert.equal(opened.canvas.products["tee-classic"].surfaces.back.objects[1].text, "Dorso actualizado");

const assetParams = new URLSearchParams({ path: manifest.assetPath });
const renewed = await expectJson(await auth(`/api/private-assets/file?${assetParams}`), 200);
const imageResponse = await fetch(renewed.url);
assert.equal(imageResponse.status, 200);
assert.equal(imageResponse.headers.get("content-type"), "image/png");
assert.ok((await imageResponse.arrayBuffer()).byteLength > 8);

const changedCanvas = structuredClone(opened.canvas);
changedCanvas.products["tee-classic"].surfaces.front.objects.push({ type: "textbox", text: "Continué después del reinicio" });
const updated = (await expectJson(await auth(`/api/projects/${manifest.projectId}`, {
  method: "PUT", headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Proyecto continuado después de reiniciar",
    productRef: "tee-classic",
    productCategory: "textil",
    variant: opened.variant,
    canvas: changedCanvas,
    production: opened.production,
  }),
}), 200)).project;
assert.equal(updated.canvas.products["tee-classic"].surfaces.front.objects.at(-1).text, "Continué después del reinicio");
const reread = (await expectJson(await auth(`/api/projects/${manifest.projectId}`), 200)).project;
assert.equal(reread.name, updated.name);

const foreignToken = (await expectJson(await fetch(`${base}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: manifest.other.email, password: manifest.other.password }),
}), 200)).accessToken;
assert.equal((await fetch(`${base}/api/projects/${manifest.projectId}`, { headers: { authorization: `Bearer ${foreignToken}` } })).status, 404);

assert.equal((await auth(`/api/projects/${manifest.projectId}`, { method: "DELETE" })).status, 200);
assert.equal((await fetch(renewed.url)).status, 404, "project deletion should remove its private R2 object");

console.log("restart verification: D1 project/user and R2 image survived a Wrangler workerd restart; login, open, continue editing and re-save passed");
console.log("post-restart foreign-user isolation and project/R2 cleanup passed");
console.log(`test user IDs: ${manifest.owner.id}, ${manifest.other.id}`);
