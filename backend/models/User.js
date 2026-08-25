import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
  {
    street:   { type: String, default: "" },
    city:     { type: String, default: "" },
    province: { type: String, default: "" },
    zip:      { type: String, default: "" },
    country:  { type: String, default: "Argentina" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // ── Identidad ──────────────────────────────────────
    firstName: {
      type:     String,
      required: [true, "El nombre es obligatorio"],
      trim:     true,
      maxlength: [50, "Máximo 50 caracteres"],
    },
    lastName: {
      type:     String,
      required: [true, "El apellido es obligatorio"],
      trim:     true,
      maxlength: [50, "Máximo 50 caracteres"],
    },
    email: {
      type:      String,
      required:  [true, "El email es obligatorio"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    phone: {
      type:  String,
      trim:  true,
      default: "",
    },

    // ── Seguridad ──────────────────────────────────────
    password: {
      type:      String,
      required:  [true, "La contraseña es obligatoria"],
      minlength: [8, "Mínimo 8 caracteres"],
      select:    false, // nunca se devuelve en queries por defecto
    },
    role: {
      type:    String,
      enum:    ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type:    Boolean,
      default: false,
    },
    refreshToken: {
      type:   String,
      select: false,
    },

    // ── Perfil ─────────────────────────────────────────
    avatar: {
      url:       { type: String, default: "" },
      publicId:  { type: String, default: "" }, // ID en Cloudinary
    },
    bio: {
      type:      String,
      maxlength: [200, "Máximo 200 caracteres"],
      default:   "",
    },
    address: {
      type:    addressSchema,
      default: () => ({}),
    },

    // ── Historial ──────────────────────────────────────
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "Order",
      },
    ],
    designs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "Design",
      },
    ],
  },
  {
    timestamps: true, // crea createdAt y updatedAt automáticamente
  }
);

// ── Índices ─────────────────────────────────────────────
userSchema.index({ email: 1 });

// ── Middleware: hashear password antes de guardar ────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Método: comparar contraseña ──────────────────────────
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Virtual: nombre completo ─────────────────────────────
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Serialización segura (quita password y refreshToken) ─
userSchema.methods.toPublic = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

export default mongoose.model("User", userSchema);
