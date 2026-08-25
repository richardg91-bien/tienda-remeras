import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import supabase from "../config/supabase.js";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_TOKEN });

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
    const { type, data } = req.body;

    if (type === "payment") {
      const payment     = new Payment(client);
      const paymentData = await payment.get({ id: data.id });
      const { status }  = paymentData;

      // Busca la orden por mp_preference_id
      const { data: order } = await supabase
        .from("orders")
        .select("id, status")
        .eq("mp_preference_id", paymentData.order?.id ?? "")
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
