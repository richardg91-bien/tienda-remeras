import mongoose from "mongoose";

const designSchema = new mongoose.Schema(
  {
    // ── Relación con el usuario ────────────────────────
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ── Imagen en Cloudinary ───────────────────────────
    image: {
      url:       { type: String, required: true },
      publicId:  { type: String, required: true }, // para eliminar de Cloudinary
      width:     { type: Number },
      height:    { type: Number },
      format:    { type: String },
      bytes:     { type: Number },
    },

    // ── Metadata del diseño ────────────────────────────
    title: {
      type:      String,
      required:  [true, "El título es obligatorio"],
      trim:      true,
      maxlength: [80, "Máximo 80 caracteres"],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: [300, "Máximo 300 caracteres"],
      default:   "",
    },

    // ── Categorización ─────────────────────────────────
    tags: {
      type:    [String],
      default: [],
      // normaliza a lowercase al guardar
      set: (tags) => tags.map((t) => t.toLowerCase().trim()),
    },
    category: {
      type: String,
      enum: ["cyberpunk", "minimalista", "streetwear", "genesis", "anime", "abstracto", "otro"],
      default: "otro",
    },

    // ── Estado ─────────────────────────────────────────
    isPublic: {
      type:    Boolean,
      default: false, // por defecto solo visible para el dueño
    },
    status: {
      type:    String,
      enum:    ["pending", "approved", "rejected"],
      default: "pending",
    },

    // ── Stats ──────────────────────────────────────────
    likes:    { type: Number, default: 0 },
    views:    { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ── Índices ──────────────────────────────────────────────
designSchema.index({ owner: 1 });
designSchema.index({ tags: 1 });
designSchema.index({ category: 1 });
designSchema.index({ isPublic: 1, status: 1 });

export default mongoose.model("Design", designSchema);
