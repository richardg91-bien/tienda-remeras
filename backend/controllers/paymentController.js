import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import Order from "../models/Order.js";
import User  from "../models/User.js";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN,
});

// ── POST /api/payments/create_preference ─────────────────────────────────────
export const createPreference = async (req, res) => {
  try {
    const { cart, shippingAddress, paymentMethod } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: "El carrito está vacío." });
    }

    // Valida que price y quantity sean números positivos
    for (const item of cart) {
      if (!item.name || typeof item.price !== "number" || item.price <= 0) {
        return res.status(400).json({ message: `Item inválido: ${item.name}` });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ message: `Cantidad inválida para: ${item.name}` });
      }
    }

    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const shipping = subtotal >= 30000 ? 0 : 1500; // envío gratis en compras +$30k
    const total    = subtotal + shipping;

    // Crea la preferencia en MercadoPago
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: cart.map((item) => ({
          title:      item.name,
          quantity:   item.quantity,
          unit_price: item.price,
          currency_id: "ARS",
        })),
        back_urls: {
          success: process.env.FRONTEND_URL + "/pago/exitoso",
          failure: process.env.FRONTEND_URL + "/pago/error",
          pending: process.env.FRONTEND_URL + "/pago/pendiente",
        },
        auto_return:         "approved",
        notification_url:    process.env.BACKEND_URL + "/api/payments/webhook",
        statement_descriptor: "NEON-STITCH",
        metadata: {
          userId: req.user?._id?.toString() || "guest",
        },
        // Agrega el shipping como ítem si aplica
        ...(shipping > 0 && {
          shipments: {
            cost:          shipping,
            mode:          "not_specified",
          },
        }),
      },
    });

    // Crea la orden en DB con estado "pending"
    const order = await Order.create({
      user:           req.user?._id || null,
      guestEmail:     req.body.guestEmail || "",
      items:          cart.map((i) => ({
        productId:    i.id || 0,
        name:         i.name,
        price:        i.price,
        quantity:     i.quantity,
        selectedSize: i.selectedSize || "",
        image:        i.image || "",
      })),
      subtotal,
      shipping,
      total,
      mpPreferenceId: result.id,
      paymentMethod:  paymentMethod || "mercadopago",
      shippingAddress: shippingAddress || {},
      status: "pending",
    });

    // Si hay usuario autenticado, guarda referencia de la orden
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { orders: order._id },
      });
    }

    return res.json({
      init_point:   result.init_point,
      sandbox_url:  result.sandbox_init_point,
      preferenceId: result.id,
      orderId:      order._id,
    });
  } catch (error) {
    console.error("createPreference error:", error);
    return res.status(500).json({ message: "Error creando preferencia de pago." });
  }
};

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// MercadoPago notifica aquí cuando cambia el estado del pago
export const webhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "payment") {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: data.id });

      const { status, metadata, external_reference } = paymentData;

      // Busca la orden por preferenceId o metadata.userId
      const order = await Order.findOne({
        mpPreferenceId: paymentData.order?.id,
      }) || await Order.findOne({ _id: external_reference });

      if (order) {
        order.mpPaymentId = String(data.id);
        order.mpStatus    = status;

        if (status === "approved") {
          order.status = "paid";
        } else if (status === "rejected" || status === "cancelled") {
          order.status = "cancelled";
        } else if (status === "in_process" || status === "pending") {
          order.status = "pending";
        }

        await order.save();
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
    const order = await Order.findById(req.params.id)
      .populate("user", "firstName lastName email");

    if (!order) return res.status(404).json({ message: "Orden no encontrada." });

    // Solo el dueño o un admin puede ver la orden
    const isOwner = req.user && order.user?._id.toString() === req.user._id.toString();
    if (!isOwner && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    return res.json({ order });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo orden." });
  }
};
