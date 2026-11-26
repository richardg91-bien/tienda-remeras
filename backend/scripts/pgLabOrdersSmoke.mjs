import assert from "node:assert/strict";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import express from "express";

if (process.env.NODE_ENV === "production" || Object.keys(process.env).some((key) => key.startsWith("RAILWAY_"))) {
  throw new Error("Refusing to run order tests in a production/Railway environment.");
}
process.env.NEON_LAB_MODE = "1";

const [{ createPaymentRouter }, { createUserRouter }, provider] = await Promise.all([
  import("../routes/paymentRoutes.js"),
  import("../routes/userRoutes.js"),
  import("../config/databaseProvider.js"),
]);
const { validateWebhookSignature } = await import("../controllers/paymentController.js");
const { getLabDatabasePool, getDatabaseProvider, assertLabTarget, closeLabDatabasePool } = provider;
assertLabTarget();
assert.equal(getDatabaseProvider(), "postgres-lab");
const pool = getLabDatabasePool();
const users = [randomUUID(), randomUUID(), randomUUID()];
const roles = new Map([[users[0], "user"], [users[1], "user"], [users[2], "admin"]]);
const runId = randomUUID();
const originalPoolConnect = pool.connect;
const testIdentityIds = new Set(users);
const gatewayCalls = { createPreference: 0, getPayment: 0, getMerchantOrder: 0 };
let lastPreferenceBody;
let webhookPreferenceId;
let failNextPaymentLookup = false;
const paymentGateway = {
  async createPreference({ body }) {
    gatewayCalls.createPreference += 1;
    lastPreferenceBody = body;
    const id = `lab-mission5/${runId}/${gatewayCalls.createPreference}`;
    return {
      id,
      init_point: `https://payments.example.invalid/${id}`,
      sandbox_init_point: `https://sandbox.example.invalid/${id}`,
    };
  },
  async getPayment({ id }) {
    gatewayCalls.getPayment += 1;
    if (failNextPaymentLookup) {
      failNextPaymentLookup = false;
      throw Object.assign(new Error("synthetic payment lookup failure"), { code: "LAB_TEST_FAILURE" });
    }
    return { id, status: "approved", order: { id: `lab-merchant-${runId}` } };
  },
  async getMerchantOrder() {
    gatewayCalls.getMerchantOrder += 1;
    return { preference_id: webhookPreferenceId };
  },
};

const identity = (required) => (req, res, next) => {
  const id = req.get("x-lab-identity");
  if (!id && !required) return next();
  if (!testIdentityIds.has(id)) return res.status(401).json({ message: "No autenticado." });
  req.user = { id, role: roles.get(id) };
  return next();
};
const app = express();
app.use(express.json({ limit: "1mb" }));
app.locals.neonLabPaymentGateway = paymentGateway;
app.locals.neonLabWebhookSecret = `test-only-${runId}`;
app.use("/api/payments", createPaymentRouter({ protect: identity(true), optionalAuth: identity(false) }));
app.use("/api/users", createUserRouter(identity(true)));

let server;
const baseUrl = await new Promise((resolve, reject) => {
  server = app.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  server.once("error", reject);
});
const request = (path, { userId, method = "GET", body, headers = {} } = {}) => fetch(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(userId ? { "x-lab-identity": userId } : {}),
    ...(body ? { "content-type": "application/json" } : {}),
    ...headers,
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
      (SELECT count(*)::int FROM public.design_projects) AS projects,
      (SELECT count(*)::int FROM public.payment_webhook_events) AS webhook_events
  `);
  return rows[0];
};
const cart = [{
  id: 1,
  name: "Neural Web Tee",
  price: 12000,
  quantity: 2,
  selectedSize: "M",
  image: "https://images.example.invalid/synthetic.png",
  productRef: "tee-classic",
  productCategory: "textil",
  variant: { size: "M", color: "black" },
  production: { resolutionDpi: 300 },
  projectRef: "synthetic-project-ref",
}];
const signWebhook = (dataId, requestId) => {
  const ts = String(Date.now());
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const digest = crypto.createHmac("sha256", app.locals.neonLabWebhookSecret).update(manifest).digest("hex");
  return { ts, signature: `ts=${ts},v1=${digest}`, digest };
};

try {
  const initial = await counts();
  await pool.query(`
    INSERT INTO public.users (id, first_name, last_name, email, password_hash, role)
    VALUES ($1, 'Order', 'Customer', $2, 'test-only', 'user'),
           ($3, 'Order', 'Customer Two', $4, 'test-only', 'user'),
           ($5, 'Order', 'Admin', $6, 'test-only', 'admin')
  `, [users[0], `lab-order-${users[0]}@example.invalid`, users[1], `lab-order-${users[1]}@example.invalid`, users[2], `lab-order-${users[2]}@example.invalid`]);

  const anon = await pool.connect();
  try {
    await anon.query("BEGIN");
    await anon.query("SET LOCAL ROLE anon");
    const { rows } = await anon.query("SELECT count(*)::int AS n FROM public.orders");
    assert.equal(rows[0].n, 0);
    await assert.rejects(
      anon.query("SELECT count(*) FROM public.payment_webhook_events"),
      (error) => error.code === "42501",
    );
    await anon.query("ROLLBACK");
  } finally {
    anon.release();
  }

  assert.equal((await request("/api/payments/order/not-a-session")).status, 401);
  assert.equal((await request("/api/users/orders", { userId: randomUUID() })).status, 401);

  const emptyCart = await request("/api/payments/create_preference", { userId: users[0], method: "POST", body: { cart: [] } });
  assert.equal(emptyCart.status, 400);
  const invalidPrice = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: { cart: [{ ...cart[0], price: 0 }] },
  });
  assert.equal(invalidPrice.status, 400);
  const invalidQuantity = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: { cart: [{ ...cart[0], quantity: 1.5 }] },
  });
  assert.equal(invalidQuantity.status, 400);
  const fractionalCent = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: { cart: [{ ...cart[0], price: 1.001, quantity: 1 }] },
  });
  assert.equal(fractionalCent.status, 400);
  const outOfRange = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: { cart: [{ ...cart[0], quantity: Number.MAX_SAFE_INTEGER }] },
  });
  assert.equal(outOfRange.status, 400);
  const manipulatedPrice = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: { cart: [{ ...cart[0], price: 1 }] },
  });
  assert.equal(manipulatedPrice.status, 400);
  const unsupportedCustomProduct = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: { cart: [{ name: "Custom design", price: 15000, quantity: 1 }] },
  });
  assert.equal(unsupportedCustomProduct.status, 400);
  assert.equal(gatewayCalls.createPreference, 0);
  console.log("Checkout validation: malformed cart data, unsupported custom products and client price tampering rejected before payment stub");

  const createResponse = await request("/api/payments/create_preference", {
    userId: users[0], method: "POST", body: {
      cart,
      shippingAddress: { city: "Synthetic City", country: "AR" },
      guestEmail: "synthetic@example.invalid",
      paymentMethod: "mercadopago",
      user_id: users[1],
    },
  });
  assert.equal(createResponse.status, 200);
  const checkout = await createResponse.json();
  assert.ok(checkout.orderId && checkout.preferenceId);
  assert.ok(checkout.init_point && checkout.sandbox_url);
  assert.equal(lastPreferenceBody.items[0].currency_id, "ARS");
  assert.equal(lastPreferenceBody.items[0].unit_price, 12000);
  assert.equal(lastPreferenceBody.items[0].quantity, 2);
  assert.deepEqual(lastPreferenceBody.shipments, { cost: 1500, mode: "not_specified" });
  console.log("POST /api/payments/create_preference: legacy response keys, ARS and shipping calculation passed (gateway simulated)");

  const orderResponse = await request(`/api/payments/order/${checkout.orderId}`, { userId: users[0] });
  assert.equal(orderResponse.status, 200);
  const order = (await orderResponse.json()).order;
  assert.equal(order.user_id, users[0]);
  assert.equal(order.subtotal, "24000.00");
  assert.equal(order.shipping, "1500.00");
  assert.equal(order.total, "25500.00");
  assert.equal(order.status, "pending");
  assert.equal(order.mp_preference_id, checkout.preferenceId);
  assert.equal(order.guest_email, "synthetic@example.invalid");
  assert.deepEqual(order.shipping_address, { city: "Synthetic City", country: "AR" });
  assert.equal(order.user.id, users[0]);
  assert.equal(order.items[0].product_id, 1);
  assert.equal(order.items[0].price, 12000);
  assert.equal(order.items[0].selected_size, "M");
  assert.deepEqual(order.items[0].variant, cart[0].variant);
  assert.deepEqual(order.items[0].production, cart[0].production);
  assert.equal(order.items[0].projectRef, "synthetic-project-ref");
  assert.equal(Object.hasOwn(order, "password_hash"), false);
  console.log("GET /api/payments/order/:id: amounts, items/variant/production/reference and owner projection preserved");

  assert.equal((await request(`/api/payments/order/${checkout.orderId}`, { userId: users[1] })).status, 403);
  assert.equal((await request(`/api/payments/order/${randomUUID()}`, { userId: users[0] })).status, 404);
  const ownOrders = await request("/api/users/orders?page=1&limit=10", { userId: users[0] });
  assert.equal(ownOrders.status, 200);
  const ownList = await ownOrders.json();
  assert.ok(ownList.orders.some((entry) => entry.id === checkout.orderId));
  assert.equal(ownList.pagination.total, 1);
  const otherOrders = await (await request("/api/users/orders", { userId: users[1] })).json();
  assert.deepEqual(otherOrders.orders, []);
  const adminOrder = await request(`/api/payments/order/${checkout.orderId}`, { userId: users[2] });
  assert.equal(adminOrder.status, 200);
  console.log("GET /api/users/orders and protected order lookup: owner isolation, admin access and unknown identity passed");

  // Simulate a database insert failure after BEGIN; controller must roll back.
  pool.connect = async function simulatedInsertFailure(...args) {
    const db = await originalPoolConnect.apply(this, args);
    return {
      query(sql, values) {
        if (typeof sql === "string" && sql.includes("INSERT INTO public.orders")) {
          throw Object.assign(new Error("synthetic database failure"), { code: "LAB_TEST_FAILURE" });
        }
        return db.query(sql, values);
      },
      release() { db.release(); },
    };
  };
  let rollbackResponse;
  try {
    rollbackResponse = await request("/api/payments/create_preference", { userId: users[0], method: "POST", body: { cart } });
  } finally {
    pool.connect = originalPoolConnect;
  }
  assert.equal(rollbackResponse.status, 500);
  const afterFailedInsert = await pool.query("SELECT count(*)::int AS n FROM public.orders WHERE mp_preference_id LIKE $1", [`lab-mission5/${runId}/%`]);
  assert.equal(afterFailedInsert.rows[0].n, 1);
  console.log("Order transaction: injected insert failure returned 500 and rolled back without a partial order");

  webhookPreferenceId = checkout.preferenceId;
  const paymentId = `lab-payment-${runId}`;
  const requestId = `lab-request-${runId}-same`;
  const eventId = `lab-event-${runId}-same`;
  const signed = signWebhook(paymentId, requestId);
  assert.equal(validateWebhookSignature({
    app: { locals: { neonLabWebhookSecret: app.locals.neonLabWebhookSecret } },
    headers: { "x-signature": signed.signature, "x-request-id": requestId },
    query: { "data.id": paymentId },
    body: { id: eventId, type: "payment", data: { id: paymentId } },
  }), true);
  const sendSignedWebhook = ({ signature = signed.signature, request = requestId, event = eventId, queryId = paymentId, includeSignature = true } = {}) => requestFn(`/api/payments/webhook?data.id=${encodeURIComponent(queryId)}`, {
    method: "POST", body: { id: event, type: "payment", data: { id: paymentId } },
    headers: { "x-request-id": request, ...(includeSignature ? { "x-signature": signature } : {}) },
  });
  const requestFn = request;

  assert.equal((await sendSignedWebhook({ signature: `ts=${signed.ts},v1=${"0".repeat(64)}` })).status, 401);
  assert.equal((await sendSignedWebhook({ signature: `ts=${signed.ts},v1=${signed.digest.slice(0, -1)}0`, queryId: `${paymentId}-altered` })).status, 401);
  assert.equal((await sendSignedWebhook({ signature: "ts=broken,v1=not-hex" })).status, 401);
  assert.equal((await sendSignedWebhook({ includeSignature: false })).status, 401);
  const configuredSecret = app.locals.neonLabWebhookSecret;
  delete app.locals.neonLabWebhookSecret;
  assert.equal((await sendSignedWebhook()).status, 401);
  app.locals.neonLabWebhookSecret = configuredSecret;
  assert.equal(gatewayCalls.getPayment, 0);

  assert.equal((await sendSignedWebhook()).status, 200);
  assert.equal((await sendSignedWebhook()).status, 200);
  assert.equal(gatewayCalls.getPayment, 1);
  const redeliveryRequestId = `lab-request-${runId}-redelivery`;
  const redeliverySig = signWebhook(paymentId, redeliveryRequestId);
  assert.equal((await sendSignedWebhook({
    signature: redeliverySig.signature, request: redeliveryRequestId, event: eventId,
  })).status, 200);
  assert.equal(gatewayCalls.getPayment, 1);

  const concurrentRequestId = `lab-request-${runId}-concurrent`;
  const concurrentEventId = `lab-event-${runId}-concurrent`;
  const concurrentSig = signWebhook(paymentId, concurrentRequestId);
  const concurrentSend = () => sendSignedWebhook({
    signature: concurrentSig.signature, request: concurrentRequestId, event: concurrentEventId,
  });
  const concurrentResponses = await Promise.all([concurrentSend(), concurrentSend()]);
  assert.deepEqual(concurrentResponses.map((response) => response.status), [200, 200]);
  assert.equal(gatewayCalls.getPayment, 2);

  const distinctRequestId = `lab-request-${runId}-distinct`;
  const distinctEventId = `lab-event-${runId}-distinct`;
  const distinctSig = signWebhook(paymentId, distinctRequestId);
  assert.equal((await sendSignedWebhook({
    signature: distinctSig.signature, request: distinctRequestId, event: distinctEventId,
  })).status, 200);
  assert.equal(gatewayCalls.getPayment, 3);

  const retryRequestId = `lab-request-${runId}-retry`;
  const retryEventId = `lab-event-${runId}-retry`;
  const retrySig = signWebhook(paymentId, retryRequestId);
  failNextPaymentLookup = true;
  assert.equal((await sendSignedWebhook({
    signature: retrySig.signature, request: retryRequestId, event: retryEventId,
  })).status, 500);
  const failedEvent = await pool.query("SELECT processing_result FROM public.payment_webhook_events WHERE event_id = $1", [retryEventId]);
  assert.equal(failedEvent.rows[0].processing_result, "failed");
  assert.equal((await sendSignedWebhook({
    signature: retrySig.signature, request: retryRequestId, event: retryEventId,
  })).status, 200);
  assert.equal(gatewayCalls.getPayment, 5);

  // The event body ID is not part of Mercado Pago's signed manifest; the signed request ID still prevents replay.
  assert.equal((await sendSignedWebhook({ event: `${eventId}-altered` })).status, 200);
  assert.equal(gatewayCalls.getPayment, 5);

  const paidOrder = await pool.query("SELECT status, mp_payment_id, mp_status FROM public.orders WHERE id = $1", [checkout.orderId]);
  assert.deepEqual(paidOrder.rows[0], { status: "paid", mp_payment_id: paymentId, mp_status: "approved" });
  const preferenceOrderCount = await pool.query("SELECT count(*)::int AS n FROM public.orders WHERE mp_preference_id = $1", [checkout.preferenceId]);
  assert.equal(preferenceOrderCount.rows[0].n, 1);
  const eventRows = await pool.query("SELECT count(*)::int AS n FROM public.payment_webhook_events WHERE event_id LIKE $1", [`lab-event-${runId}-%`]);
  assert.equal(eventRows.rows[0].n, 4);
  assert.equal(gatewayCalls.getMerchantOrder, 4);
  console.log("Webhook simulation: official HMAC format, tamper/missing-secret rejection, persistent event/request dedupe, concurrency, distinct events and failed-event retry passed");

  assert.equal(gatewayCalls.createPreference, 2);
  const countBeforeCleanup = await counts();
  assert.deepEqual(countBeforeCleanup, { ...initial, users: initial.users + 3, orders: initial.orders + 1, webhook_events: initial.webhook_events + 4 });
  await pool.query("DELETE FROM public.orders WHERE mp_preference_id LIKE $1", [`lab-mission5/${runId}/%`]);
  await pool.query("DELETE FROM public.payment_webhook_events WHERE event_id LIKE $1", [`lab-event-${runId}-%`]);
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [users]);
  const final = await counts();
  assert.deepEqual(final, initial);
  console.log(`original counts restored: ${JSON.stringify(final)}`);
  console.log("Payment boundary: only the injected local gateway was used; no MercadoPago/Cloudinary network calls");
} catch (error) {
  console.error("orders lab test failed:", { code: error?.code || "unknown", message: error.message });
  process.exitCode = 1;
} finally {
  pool.connect = originalPoolConnect;
  await pool.query("DELETE FROM public.orders WHERE mp_preference_id LIKE $1", [`lab-mission5/${runId}/%`]).catch(() => {});
  await pool.query("DELETE FROM public.payment_webhook_events WHERE event_id LIKE $1", [`lab-event-${runId}-%`]).catch(() => {});
  await pool.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [users]).catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeLabDatabasePool();
}
