import assert from "node:assert/strict";
import express from "express";
import { createPrivateAssetRouter } from "../routes/privateAssetRoutes.js";
import { createPrivateAssetHandlers } from "../controllers/projectController.js";

const users = new Set([
  "8da3a1b9-ec3a-4e38-aea0-000000000001",
  "8da3a1b9-ec3a-4e38-aea0-000000000002",
]);
const objects = new Map();
const signedRequests = [];
let failNextSigning = false;
const fakeSupabase = {
  storage: {
    from(bucket) {
      assert.equal(bucket, "customer-designs");
      return {
        async upload(path, buffer, options) {
          assert.equal(options.upsert, false);
          objects.set(path, { buffer, contentType: options.contentType });
          return { error: null };
        },
        async createSignedUrl(path, expiresIn) {
          signedRequests.push({ path, expiresIn });
          if (failNextSigning) {
            failNextSigning = false;
            return { data: null, error: new Error("synthetic signing failure") };
          }
          if (!objects.has(path)) return { data: null, error: new Error("not found") };
          return { data: { signedUrl: `https://storage.example.invalid/object/${encodeURIComponent(path)}?signature=${signedRequests.length}` }, error: null };
        },
        async list(prefix) {
          const files = [...objects.keys()]
            .filter((path) => path.startsWith(`${prefix}/`))
            .map((path) => ({ id: path, name: path.slice(prefix.length + 1), metadata: { size: objects.get(path).buffer.length } }));
          return { data: files, error: null };
        },
        async remove(paths) {
          paths.forEach((path) => objects.delete(path));
          return { data: paths, error: null };
        },
      };
    },
  },
};

const authMiddleware = (req, res, next) => {
  const userId = req.get("x-test-user");
  if (!users.has(userId)) return res.status(401).json({ message: "No autenticado." });
  req.user = { id: userId };
  next();
};
const uploader = {
  single(field) {
    assert.equal(field, "image");
    return (req, _res, next) => {
      req.file = {
        buffer: Buffer.from("synthetic-image"),
        originalname: "logo sketch.png",
        mimetype: "image/png",
        size: 15,
      };
      next();
    };
  },
};
const app = express();
app.use("/api/private-assets", createPrivateAssetRouter({
  authMiddleware,
  uploader,
  handlers: createPrivateAssetHandlers({ getSupabase: async () => fakeSupabase }),
}));

let server;
const baseUrl = await new Promise((resolve, reject) => {
  server = app.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  server.once("error", reject);
});
const userA = [...users][0];
const userB = [...users][1];
const request = (path, { userId, method = "GET" } = {}) => fetch(`${baseUrl}${path}`, {
  method,
  headers: userId ? { "x-test-user": userId } : {},
});

try {
  assert.equal((await request("/api/private-assets")).status, 401);

  const uploadResponse = await request("/api/private-assets", { userId: userA, method: "POST" });
  assert.equal(uploadResponse.status, 201);
  const { asset } = await uploadResponse.json();
  assert.ok(asset.path.startsWith(`${userA}/`));
  assert.match(asset.path, /logo_sketch\.png$/);
  assert.equal(asset.expiresIn, 300);
  assert.match(asset.url, /signature=/);
  assert.equal(objects.size, 1);

  const listAResponse = await request("/api/private-assets", { userId: userA });
  const { assets: assetsA } = await listAResponse.json();
  assert.equal(assetsA.length, 1);
  assert.equal(assetsA[0].path, asset.path);
  assert.equal(assetsA[0].expiresIn, 300);

  const signingCountBeforeDenied = signedRequests.length;
  const denied = new URLSearchParams({ path: asset.path });
  assert.equal((await request(`/api/private-assets/file?${denied}`, { userId: userB })).status, 403);
  assert.equal(signedRequests.length, signingCountBeforeDenied);
  const traversal = new URLSearchParams({ path: `${userA}/../${userB}/private.png` });
  assert.equal((await request(`/api/private-assets/file?${traversal}`, { userId: userA })).status, 403);

  const renewal = new URLSearchParams({ path: asset.path });
  const renewedResponse = await request(`/api/private-assets/file?${renewal}`, { userId: userA });
  assert.equal(renewedResponse.status, 200);
  const renewed = await renewedResponse.json();
  assert.equal(renewed.expiresIn, 300);
  assert.notEqual(renewed.url, asset.url);

  const listBResponse = await request("/api/private-assets", { userId: userB });
  assert.deepEqual((await listBResponse.json()).assets, []);

  failNextSigning = true;
  assert.equal((await request("/api/private-assets", { userId: userA, method: "POST" })).status, 500);
  assert.equal(objects.size, 1, "failed URL signing must clean up the newly uploaded object");

  console.log("private upload/list/URL renewal: passed with synthetic Storage; signed lifetime=300 seconds");
  console.log("owner isolation, traversal rejection, and upload cleanup after signing failure: passed");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
