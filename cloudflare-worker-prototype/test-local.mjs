import assert from "node:assert/strict";

const base = process.env.WORKER_TEST_URL || "http://127.0.0.1:8787";
const syntheticEmail = `worker-lab-${crypto.randomUUID()}@example.invalid`;
const password = "SyntheticPassword123";

const health = await fetch(`${base}/health`).then((response) => response.json());
assert.equal(health.ok, true);

const registration = await fetch(`${base}/api/auth/register`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ firstName: "Worker", lastName: "Lab", email: syntheticEmail, password }),
});
assert.equal(registration.status, 201);
const regData = await registration.json();
assert.equal(regData.message, "Cuenta creada exitosamente.");
assert.ok(regData.bcryptMs > 0);
assert.ok(regData.accessToken);
assert.match(registration.headers.get("set-cookie") || "", /HttpOnly/i);
assert.match(registration.headers.get("set-cookie") || "", /Secure/i);
assert.match(registration.headers.get("set-cookie") || "", /SameSite=Lax/i);

const me = await fetch(`${base}/api/auth/cookie-check`, { headers: { cookie: "refreshToken=synthetic-cookie-test" } }).then((r) => r.json());
assert.equal(me.cookieReceived, true);

const loginResponse = await fetch(`${base}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: syntheticEmail, password }),
});
assert.equal(loginResponse.status, 200);
const loginData = await loginResponse.json();
assert.equal(loginData.message, "Login exitoso.");
assert.ok(loginData.bcryptMs > 0);
assert.ok(loginData.accessToken);

const jwtCheck = await fetch(`${base}/api/users/change-password`, {
  method: "PUT", headers: { authorization: `Bearer ${loginData.accessToken}`, "content-type": "application/json" },
  body: JSON.stringify({ currentPassword: password, newPassword: "SyntheticPassword456" }),
});
assert.equal(jwtCheck.status, 200);
const changed = await jwtCheck.json();
assert.equal(changed.message, "Contraseña actualizada exitosamente.");
assert.ok(changed.verifyMs > 0 && changed.bcryptMs > 0);

const oldLogin = await fetch(`${base}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: syntheticEmail, password }),
});
assert.equal(oldLogin.status, 401);
const newLogin = await fetch(`${base}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: syntheticEmail, password: "SyntheticPassword456" }),
});
assert.equal(newLogin.status, 200);

const compatResponse = await fetch(`${base}/compat`);
assert.equal(compatResponse.status, 200);
const compatibility = await compatResponse.json();
console.log(JSON.stringify({ health, bcryptMs: { register: regData.bcryptMs, login: loginData.bcryptMs, changeHash: changed.bcryptMs, changeVerify: changed.verifyMs }, jwt: true, cookieFlags: registration.headers.get("set-cookie"), compatibility }, null, 2));
