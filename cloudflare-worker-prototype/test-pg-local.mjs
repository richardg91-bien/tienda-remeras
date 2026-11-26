import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

const baseUrl = process.env.WORKER_TEST_URL || "http://127.0.0.1:8788";
const health = await fetch(`${baseUrl}/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).runtime, "workers-local-workerd");
console.log("local workerd health: passed");

const response = await fetch(`${baseUrl}/lab/postgres`);
assert.equal(response.status, 200, "Worker could not read local PostgreSQL through the local Hyperdrive binding");
const result = await response.json();
assert.equal(result.database.database, "tienda_remeras_app_lab");
assert.match(result.database.version, /^17\./);
assert.equal(result.models.length, 6);
assert.ok(result.models.every((model) => model.id && model.category && model.name
  && Array.isArray(model.print_surfaces) && model.print_surfaces.length > 0
  && model.production_template && model.variant_schema));
console.log(`local workerd pg Client: PostgreSQL ${result.database.version}; six catalog models read with surface dimensions`);

const subject = randomUUID();
const token = jwt.sign({ id: subject }, "synthetic-local-only-project-test-secret", { expiresIn: "2m" });
const isolation = await fetch(`${baseUrl}/lab/project-isolation`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
});
assert.equal(isolation.status, 200, "Worker could not run the synthetic project isolation transaction");
const isolationResult = await isolation.json();
for (const [check, passed] of Object.entries(isolationResult)) {
  assert.equal(passed, true, `Worker project isolation check failed: ${check}`);
}
console.log("local workerd project test: JWT subject scoped through PostgreSQL RLS; foreign access denied; rollback left no rows");
