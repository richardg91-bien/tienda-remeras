import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId:    { type: Number, required: true },   // ID del producto en el frontend
    name:         { type: String, required: true },
    price:        { type: Number, required: true },
    quantity:     { type: Number, required: true, min: 1 },
    selectedSize: { type: String, default: "" },
    image:        { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // ── Relación con usuario ───────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      // puede ser null si compra como invitado
    },
    guestEmail: {
      type:  String,
      default: "",
    },

    // ── Productos ─────────────────────────────────────
    items: {
      type:     [orderItemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "La orden debe tener al menos 1 item"],
    },

    // ── Montos ────────────────────────────────────────
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    total:    { type: Number, required: true },

    // ── MercadoPago ───────────────────────────────────
    mpPreferenceId: { type: String, default: "" },
    mpPaymentId:    { type: String, default: "" },
    mpStatus:       { type: String, default: "" },

    // ── Estado de la orden ────────────────────────────
    status: {
      type:    String,
      enum:    ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
    },

    // ── Envío ─────────────────────────────────────────
    shippingAddress: {
      street:   { type: String, default: "" },
      city:     { type: String, default: "" },
      province: { type: String, default: "" },
      zip:      { type: String, default: "" },
      country:  { type: String, default: "Argentina" },
    },

    // ── Método de pago ─────────────────────────────────
    paymentMethod: {
      type:    String,
      enum:    ["mercadopago", "whatsapp", "transfer"],
      default: "mercadopago",
    },

    // ── Notas internas ─────────────────────────────────
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// ── Índices ──────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ mpPreferenceId: 1 });

export default mongoose.model("Order", orderSchema);
