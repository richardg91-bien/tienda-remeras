import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from "mercadopago";
import crypto from "crypto";
import supabase from "../config/supabase.js";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_TOKEN });

// ── Validación de firma del webhook (docs MercadoPago) ───────────────────────
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
const validateWebhookSignature = (req) => {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secret configurado no hay forma de validar; en producción esto debe existir.
    console.warn("webhook: MP_WEBHOOK_SECRET no configurado, se saltea la validación de firma.");
    return true;
  }

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  if (!signature || !requestId) return false;

  // x-signature: ts=<timestamp>,v1=<hash>
  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const idx = p.indexOf(":");
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    })
  );
  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  // dataID: query param ?data.id o del body
  const dataId = req.query["data.id"] || req.body?.data?.id;
  if (!dataId) return false;

  // Orden exigida por la doc: dataID -> requestID -> ts -> DELIMITER -> secret
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
};

// ── POST /api/payments/create_preference ─────────────────────────────────────
export const createPreference = async (req, res) => {
  try {
    const { cart, shippingAddress, paymentMethod, guestEmail } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: "El carrito está vacío." });
    }

    for (const item of cart) {
      if (!item.name || typeof item.price !== "number" || item.price <= 0) {
        return res.status(400).json({ message: `Item inválido: ${item.name}` });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ message: `Cantidad inválida para: ${item.name}` });
      }
    }

    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const shipping = subtotal >= 30000 ? 0 : 1500;
    const total    = subtotal + shipping;

    // Crea preferencia en MercadoPago
    const preference = new Preference(client);
    const mp = await preference.create({
      body: {
        items: cart.map((item) => ({
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
      },
    });

    // Persiste la orden en Supabase
    const orderItems = cart.map((i) => ({
      product_id:    i.id ?? 0,
      name:          i.name,
      price:         i.price,
      quantity:      i.quantity,
      selected_size: i.selectedSize ?? "",
      image:         i.image ?? "",
    }));

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id:          req.user?.id ?? null,
        guest_email:      guestEmail ?? "",
        items:            orderItems,
        subtotal,
        shipping,
        total,
        mp_preference_id: mp.id,
        payment_method:   paymentMethod ?? "mercadopago",
        shipping_address: shippingAddress ?? {},
        status:           "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({
      init_point:   mp.init_point,
      sandbox_url:  mp.sandbox_init_point,
      preferenceId: mp.id,
      orderId:      order.id,
    });
  } catch (error) {
    console.error("createPreference error:", error);
    return res.status(500).json({ message: "Error creando preferencia de pago." });
  }
};

// ── POST /api/payments/webhook ────────────────────────────────────────────────
export const webhook = async (req, res) => {
  try {
    // Rechaza notificaciones sin firma válida de MercadoPago
    if (!validateWebhookSignature(req)) {
      console.warn("webhook: firma x-signature inválida o ausente, notificación rechazada.");
      return res.sendStatus(401);
    }

    const { type, data } = req.body;

    if (type === "payment") {
      const payment     = new Payment(client);
      const paymentData = await payment.get({ id: data.id });
      const { status }  = paymentData;

      // Busca la orden por el preference_id (external_reference si está disponible)
      let preferenceId =
        paymentData.external_reference ||
        paymentData.metadata?.preference_id ||
        "";

      // Si el pago viene de una preferencia, resuelve el preference_id vía la merchant order
      if (!preferenceId && paymentData.order?.id) {
        try {
          const mo = await new MerchantOrder(client).get({ merchantOrderId: String(paymentData.order.id) });
          preferenceId = mo?.preference_id ?? "";
        } catch (e) {
          console.warn("webhook: no se pudo resolver la merchant order:", e?.message ?? e);
        }
      }

      const { data: order } = await supabase
        .from("orders")
        .select("id, status")
        .eq("mp_preference_id", preferenceId)
        .maybeSingle();

      if (order) {
        let newStatus = order.status;
        if (status === "approved")                        newStatus = "paid";
        if (status === "rejected" || status === "cancelled") newStatus = "cancelled";
        if (status === "in_process" || status === "pending") newStatus = "pending";

        await supabase
          .from("orders")
          .update({ mp_payment_id: String(data.id), mp_status: status, status: newStatus })
          .eq("id", order.id);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("webhook error:", error);
    return res.sendStatus(500);
  }
};

// ── GET /api/payments/order/:id ───────────────────────────────────────────────
export const getOrder = async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, user:user_id ( id, first_name, last_name, email )")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!order) return res.status(404).json({ message: "Orden no encontrada." });

    const isOwner = req.user && order.user_id === req.user.id;
    if (!isOwner && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    return res.json({ order });
  } catch (error) {
    console.error("getOrder error:", error);
    return res.status(500).json({ message: "Error obteniendo orden." });
  }
};
