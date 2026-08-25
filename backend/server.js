import express      from "express";
import cors         from "cors";
import dotenv       from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit    from "express-rate-limit";
import connectDB    from "./config/db.js";

// Rutas
import authRoutes    from "./routes/authRoutes.js";
import userRoutes    from "./routes/userRoutes.js";
import designRoutes  from "./routes/designRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

dotenv.config();

// ── Conectar base de datos ────────────────────────────────
await connectDB();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────

// CORS: permite al frontend comunicarse
app.use(cors({
  origin:      process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true, // necesario para que las cookies funcionen
}));

// Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Rate limit global (protección básica contra abusos)
app.use(rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutos
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Demasiadas solicitudes. Intentá en unos minutos." },
}));

// ── Rutas de la API ───────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/designs",  designRoutes);
app.use("/api/payments", paymentRoutes);

// Compatibilidad con el endpoint original del frontend
app.post("/create_preference", (req, res) => {
  res.redirect(307, "/api/payments/create_preference");
});

// ── Health check ──────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({
    status:  "ok",
    service: "NEON-STITCH API",
    time:    new Date().toISOString(),
  });
});

// ── Ruta 404 ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.method} ${req.path} no encontrada.` });
});

// ── Manejador de errores global ───────────────────────────
app.use((err, req, res, _next) => {
  console.error("Error no manejado:", err);

  // Error de Multer (archivo demasiado grande)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "El archivo excede el tamaño máximo permitido." });
  }
  // Error de validación de Mongoose
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ message: messages.join(". ") });
  }
  // Error de clave duplicada (ej: email único)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `Ya existe un registro con ese ${field}.` });
  }

  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor.",
  });
});

// ── Iniciar servidor ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NEON-STITCH API corriendo en puerto ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth:   http://localhost:${PORT}/api/auth`);
  console.log(`👤 Users:  http://localhost:${PORT}/api/users`);
  console.log(`🎨 Designs:http://localhost:${PORT}/api/designs`);
  console.log(`💳 Payments:http://localhost:${PORT}/api/payments\n`);
});
