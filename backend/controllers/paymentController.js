import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from "mercadopago";
import crypto from "crypto";
import { getDatabaseProvider, getLabDatabasePool } from "../config/databaseProvider.js";

const getSupabase = async () => (await import("../config/supabase.js")).default;
const labDatabase = () => getDatabaseProvider() === "postgres-lab";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_TOKEN });

// ── Validación de firma del webhook (docs MercadoPago) ───────────────────────
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
export const validateWebhookSignature = (req) => {
  const secret = labDatabase()
    ? req.app?.locals?.neonLabWebhookSecret
    : process.env.MP_WEBHOOK_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return false;

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  if (typeof signature !== "string" || typeof requestId !== "string" || requestId.length === 0) return false;

  // x-signature: ts=<timestamp>,v1=<hash>
  const fields = new Map();
  for (const part of signature.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) return false;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key || !value || fields.has(key)) return false;
    fields.set(key, value);
  }
  const ts = fields.get("ts");
  const hash = fields.get("v1");
  if (!ts || !/^\d+$/.test(ts) || !hash || !/^[a-fA-F0-9]{64}$/.test(hash)) return false;

  const queryDataId = req.query?.["data.id"];
  const bodyDataId = req.body?.data?.id;
  const dataId = queryDataId ?? bodyDataId;
  if (typeof dataId !== "string" && typeof dataId !== "number") return false;
  const normalizedDataId = String(dataId);
  if (!normalizedDataId) return false;

  // Orden exigida por la doc: dataID -> requestID -> ts -> DELIMITER -> secret
  const manifest = `id:${normalizedDataId};request-id:${requestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ── POST /api/payments/create_preference ─────────────────────────────────────
export const createPreference = async (req, res) => {
  try {
    const { cart, shippingAddress, paymentMethod, guestEmail } = req.body || {};

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: "El carrito está vacío." });
    }

    let checkoutCart = cart;
    if (labDatabase()) {
      const { products: catalogProducts } = await import("../../src/data/products.js");
      checkoutCart = cart.map((item) => {
        if (!item || typeof item.name !== "string") throw Object.assign(new Error("Producto inválido."), { statusCode: 400 });
        const candidates = catalogProducts.filter((product) =>
          item.id !== undefined ? String(product.id) === String(item.id) : product.name === item.name
        );
        if (candidates.length !== 1 || candidates[0].name !== item.name) {
          throw Object.assign(new Error("Producto desconocido o ambiguo."), { statusCode: 400 });
        }
        const product = candidates[0];
        if (typeof item.price !== "number" || item.price !== product.price) {
          throw Object.assign(new Error("El precio enviado no coincide con el catálogo."), { statusCode: 400 });
        }
        const selectedSize = item.selectedSize ?? item.selected_size;
        if (selectedSize && Array.isArray(product.sizes) && !product.sizes.includes(selectedSize)) {
          throw Object.assign(new Error("Variante de producto inválida."), { statusCode: 400 });
        }
        return { ...item, id: product.id, name: product.name, price: product.price };
      });
    }

    if (labDatabase()) for (const item of cart) {
      if (!item || typeof item.name !== "string" || !item.name.trim()
          || typeof item.price !== "number" || !Number.isFinite(item.price) || item.price <= 0) {
        return res.status(400).json({ message: "Item inválido." });
      }
      if (Math.abs(item.price * 100 - Math.round(item.price * 100)) > 1e-7) {
        return res.status(400).json({ message: "El precio debe tener hasta dos decimales." });
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ message: "Cantidad inválida." });
      }
    }

    const pricedCart = checkoutCart;
    const subtotalCents = pricedCart.reduce((acc, i) => acc + Math.round(i.price * 100) * i.quantity, 0);
    if (!Number.isSafeInteger(subtotalCents)) return res.status(400).json({ message: "El importe de la orden está fuera de rango." });
    const subtotal = labDatabase()
      ? subtotalCents / 100
      : cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const shipping = subtotal >= 30000 ? 0 : 1500;
    const total    = subtotal + shipping;
    if (labDatabase() && (!Number.isFinite(total) || total > 9_999_999_999.99)) {
      return res.status(400).json({ message: "El importe de la orden está fuera de rango." });
    }
    const method = paymentMethod ?? "mercadopago";
    if (labDatabase() && !["mercadopago", "whatsapp", "transfer"].includes(method)) {
      return res.status(400).json({ message: "Método de pago inválido." });
    }
    if (labDatabase() && shippingAddress !== undefined && (!shippingAddress || typeof shippingAddress !== "object" || Array.isArray(shippingAddress))) {
      return res.status(400).json({ message: "Dirección de envío inválida." });
    }
    if (labDatabase() && guestEmail !== undefined && typeof guestEmail !== "string") {
      return res.status(400).json({ message: "Email de invitado inválido." });
    }

    const preferenceBody = {
        items: pricedCart.map((item) => ({
          title:       item.name,
          quantity:    item.quantity,
          unit_price:  item.price,
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pago/exitoso`,
          failure: `${process.env.FRONTEND_URL}/pago/error`,
          pending: `${process.env.FRONTEND_URL}/pago/pendiente`,
        },
        auto_return:          "approved",
        notification_url:     `${process.env.BACKEND_URL}/api/payments/webhook`,
        statement_descriptor: "NEON-STITCH",
        metadata: { userId: req.user?.id ?? "guest" },
        ...(shipping > 0 && {
          shipments: { cost: shipping, mode: "not_specified" },
        }),
    };

    // Lab mode never falls through to the MercadoPago SDK or network.
    let mp;
    if (labDatabase()) {
      const gateway = req.app?.locals?.neonLabPaymentGateway;
      if (typeof gateway?.createPreference !== "function") {
        return res.status(503).json({ message: "La pasarela simulada de laboratorio no está configurada." });
      }
      mp = await gateway.createPreference({ body: preferenceBody });
    } else {
      mp = await new Preference(client).create({ body: preferenceBody });
    }
    if (!mp?.id) throw new Error("Payment preference did not return an identifier.");

    // Keep the current order snapshot fields and preserve additional product,
    // variant, production or project references supplied by a future caller.
    const orderItems = pricedCart.map((i) => ({
        product_id: i.id ?? i.product_id ?? 0,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        selected_size: i.selectedSize ?? i.selected_size ?? "",
        image: i.image ?? "",
    }));
    const labOrderItems = pricedCart.map((i, index) => {
      const orderItem = { ...orderItems[index] };
      for (const field of ["productRef", "productCategory", "variant", "production", "projectId", "projectRef"]) {
        if (i[field] !== undefined) orderItem[field] = i[field];
      }
      return orderItem;
    });

    let order;
    const values = [req.user?.id ?? null, guestEmail ?? "", JSON.stringify(labDatabase() ? labOrderItems : orderItems), subtotal, shipping,
      total, String(mp.id), method, JSON.stringify(shippingAddress ?? {})];
    if (labDatabase()) {
      const pool = getLabDatabasePool();
      const db = await pool.connect();
      try {
        await db.query("BEGIN");
        const { rows } = await db.query(`
          INSERT INTO public.orders
            (user_id, guest_email, items, subtotal, shipping, total, mp_preference_id,
             payment_method, shipping_address, status)
          VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9::jsonb, 'pending')
          RETURNING *
        `, values);
        order = rows[0];
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      } finally {
        db.release();
      }
    } else {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("orders").insert({
        user_id: req.user?.id ?? null, guest_email: guestEmail ?? "", items: orderItems,
        subtotal, shipping, total, mp_preference_id: mp.id, payment_method: method,
        shipping_address: shippingAddress ?? {}, status: "pending",
      }).select().single();
      if (error) throw error;
      order = data;
    }

    return res.json({
      init_point:   mp.init_point,
      sandbox_url:  mp.sandbox_init_point,
      preferenceId: mp.id,
      orderId:      order.id,
    });
  } catch (error) {
    if (labDatabase() && error?.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error("createPreference error:", { code: error?.code || "unknown" });
    return res.status(500).json({ message: "Error creando preferencia de pago." });
  }
};

// ── POST /api/payments/webhook ────────────────────────────────────────────────
export const webhook = async (req, res) => {
  let claimedLabEventId;
  try {
    // Rechaza notificaciones sin firma válida de MercadoPago
    if (!validateWebhookSignature(req)) {
      console.warn("webhook: firma x-signature inválida o ausente, notificación rechazada.");
      return res.sendStatus(401);
    }

    const { type, data } = req.body;

    if (type === "payment") {
      const notificationId = req.body?.id;
      const requestId = req.headers["x-request-id"];
      if (labDatabase() && (notificationId === undefined || notificationId === null || String(notificationId).length === 0)) {
        return res.status(400).json({ message: "La notificación no incluye un identificador de evento." });
      }
      if (labDatabase()) {
        const eventDb = await getLabDatabasePool().connect();
        try {
          await eventDb.query("BEGIN");
          const inserted = await eventDb.query(`
            INSERT INTO public.payment_webhook_events
              (provider, event_id, request_id, payment_id, event_type)
            VALUES ('mercadopago', $1, $2, $3, 'payment')
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [String(notificationId), String(req.headers["x-request-id"]), String(data.id)]);
          if (inserted.rowCount) {
            claimedLabEventId = inserted.rows[0].id;
          } else {
            const existing = await eventDb.query(`
              SELECT id, processing_result, received_at
              FROM public.payment_webhook_events
              WHERE provider = 'mercadopago' AND (event_id = $1 OR request_id = $2)
              FOR UPDATE
            `, [String(notificationId), String(req.headers["x-request-id"])]);
            const retryable = existing.rows.find((row) =>
              row.processing_result === "failed"
              || (row.processing_result === "received" && Date.now() - new Date(row.received_at).getTime() > 5 * 60 * 1000)
            );
            if (retryable) {
              const retry = await eventDb.query(`
                UPDATE public.payment_webhook_events
                SET processing_result = 'received', received_at = now(), processed_at = NULL
                WHERE id = $1 RETURNING id
              `, [retryable.id]);
              claimedLabEventId = retry.rows[0]?.id;
            }
          }
          if (!claimedLabEventId) {
            await eventDb.query("COMMIT");
            return res.sendStatus(200);
          }
          await eventDb.query("COMMIT");
        } catch (error) {
          await eventDb.query("ROLLBACK");
          throw error;
        } finally {
          eventDb.release();
        }
      }
      let paymentData;
      if (labDatabase()) {
        const gateway = req.app?.locals?.neonLabPaymentGateway;
        if (typeof gateway?.getPayment !== "function") {
          await getLabDatabasePool().query(`
            UPDATE public.payment_webhook_events
            SET processing_result = 'failed', processed_at = now()
            WHERE id = $1 AND processing_result = 'received'
          `, [claimedLabEventId]);
          claimedLabEventId = undefined;
          return res.status(503).json({ message: "La pasarela simulada de laboratorio no está configurada." });
        }
        paymentData = await gateway.getPayment({ id: data.id });
      } else {
        paymentData = await new Payment(client).get({ id: data.id });
      }
      const { status }  = paymentData;

      // Busca la orden por el preference_id (external_reference si está disponible)
      let preferenceId =
        paymentData.external_reference ||
        paymentData.metadata?.preference_id ||
        "";

      // Si el pago viene de una preferencia, resuelve el preference_id vía la merchant order
      if (!preferenceId && paymentData.order?.id) {
        try {
          const mo = labDatabase()
            ? await req.app.locals.neonLabPaymentGateway?.getMerchantOrder?.({ merchantOrderId: String(paymentData.order.id) })
            : await new MerchantOrder(client).get({ merchantOrderId: String(paymentData.order.id) });
          preferenceId = mo?.preference_id ?? "";
        } catch (e) {
          console.warn("webhook: no se pudo resolver la merchant order:", { code: e?.code || "unknown" });
        }
      }

      if (labDatabase()) {
        const db = await getLabDatabasePool().connect();
        try {
          await db.query("BEGIN");
          const { rows } = await db.query(
            "SELECT id, status FROM public.orders WHERE mp_preference_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
            [String(preferenceId)],
          );
          if (rows[0]) {
            let newStatus = rows[0].status;
            if (status === "approved") newStatus = "paid";
            if (status === "rejected" || status === "cancelled") newStatus = "cancelled";
            if (status === "in_process" || status === "pending") newStatus = "pending";
            await db.query(`
              UPDATE public.orders SET mp_payment_id = $1, mp_status = $2, status = $3
              WHERE id = $4
                AND (mp_payment_id IS DISTINCT FROM $1 OR mp_status IS DISTINCT FROM $2 OR status IS DISTINCT FROM $3)
            `, [String(data.id), status, newStatus, rows[0].id]);
            await db.query(`
              UPDATE public.payment_webhook_events
              SET order_id = $1, processing_result = 'applied', processed_at = now()
              WHERE id = $2
            `, [rows[0].id, claimedLabEventId]);
          } else {
            await db.query(`
              UPDATE public.payment_webhook_events
              SET processing_result = 'unmatched', processed_at = now()
              WHERE id = $1
            `, [claimedLabEventId]);
          }
          await db.query("COMMIT");
          if (!rows[0]) console.warn("webhook: pago simulado sin orden asociada.");
        } catch (error) {
          await db.query("ROLLBACK");
          throw error;
        } finally {
          db.release();
        }
      } else {
        const supabase = await getSupabase();
        const { data: order } = await supabase.from("orders").select("id, status")
          .eq("mp_preference_id", preferenceId).maybeSingle();
        if (order) {
          let newStatus = order.status;
          if (status === "approved") newStatus = "paid";
          if (status === "rejected" || status === "cancelled") newStatus = "cancelled";
          if (status === "in_process" || status === "pending") newStatus = "pending";
          await supabase.from("orders").update({ mp_payment_id: String(data.id), mp_status: status, status: newStatus }).eq("id", order.id);
        } else {
          // Pago válido sin orden asociada: se registra para poder conciliar a mano.
          console.warn("webhook: pago sin orden asociada.");
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    if (claimedLabEventId && labDatabase()) {
      await getLabDatabasePool().query(`
        UPDATE public.payment_webhook_events
        SET processing_result = 'failed', processed_at = now()
        WHERE id = $1 AND processing_result = 'received'
      `, [claimedLabEventId]).catch(() => {});
    }
    console.error("webhook error:", { code: error?.code || "unknown" });
    return res.sendStatus(500);
  }
};

// ── GET /api/payments/order/:id ───────────────────────────────────────────────
export const getOrder = async (req, res) => {
  try {
    let order;
    if (labDatabase()) {
      const { rows } = await getLabDatabasePool().query(`
        SELECT o.*,
          CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email
          ) END AS user
        FROM public.orders o LEFT JOIN public.users u ON u.id = o.user_id
        WHERE o.id = $1
      `, [req.params.id]);
      order = rows[0] || null;
    } else {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("orders")
        .select("*, user:user_id ( id, first_name, last_name, email )")
        .eq("id", req.params.id).maybeSingle();
      if (error) throw error;
      order = data;
    }
    if (!order) return res.status(404).json({ message: "Orden no encontrada." });

    const isOwner = req.user && order.user_id === req.user.id;
    if (!isOwner && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    return res.json({ order });
  } catch (error) {
    console.error("getOrder error:", { code: error?.code || "unknown" });
    return res.status(500).json({ message: "Error obteniendo orden." });
  }
};
