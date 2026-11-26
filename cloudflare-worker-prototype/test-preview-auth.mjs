import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.WORKER_TEST_URL;
const token = process.env.WORKER_TEST_TOKEN;
assert.ok(baseUrl && token, "Preview URL and temporary token are required");
const request = (path, init = {}) => fetch(`${baseUrl}${path}`, {
  ...init,
  headers: { "x-lab-probe-token": token, ...(init.headers || {}) },
});

let healthResponse;
for (let attempt = 0; attempt < 8; attempt += 1) {
  healthResponse = await request("/health");
  if (healthResponse.status === 200) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.equal(healthResponse.status, 200);
assert.equal((await healthResponse.json()).runtime, "workers-workerd");

const email = `hosted-preview-${randomUUID()}@example.invalid`;
const password = "SyntheticPreviewPassword123";
const registration = await request("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ firstName: "Preview", lastName: "Synthetic", email, password }),
});
assert.equal(registration.status, 201);
const registered = await registration.json();
assert.equal(registered.user.email, email);
assert.ok(registered.accessToken);
for (const flag of ["HttpOnly", "Secure", "SameSite=Lax"]) {
  assert.ok(registration.headers.get("set-cookie")?.includes(flag), `Missing cookie flag ${flag}`);
}

const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
assert.equal(login.status, 200);
const loggedIn = await login.json();
assert.equal(loggedIn.user.id, registered.user.id);

const changed = await request("/api/users/change-password", {
  method: "PUT",
  headers: { authorization: `Bearer ${loggedIn.accessToken}`, "content-type": "application/json" },
  body: JSON.stringify({ currentPassword: password, newPassword: "SyntheticPreviewPassword456" }),
});
assert.equal(changed.status, 200);

const compatibility = await request("/compat").then(async (response) => {
  assert.equal(response.status, 200);
  return response.json();
});
assert.ok(Object.values(compatibility).every(Boolean));
console.log("auth compatibility harness passed: Express /health, synthetic registration/login/password change, JWT, cookie flags, and SDK construction without external calls");
