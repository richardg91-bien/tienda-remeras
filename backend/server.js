import dotenv       from "dotenv";
dotenv.config();

import express      from "express";
import cors         from "cors";
import cookieParser from "cookie-parser";
import rateLimit    from "express-rate-limit";

// Importaciones dinámicas DESPUÉS de dotenv (garantiza que process.env está listo)
const { default: supabase }      = await import("./config/supabase.js");
const { default: authRoutes }    = await import("./routes/authRoutes.js");
const { default: userRoutes }    = await import("./routes/userRoutes.js");
const { default: designRoutes }  = await import("./routes/designRoutes.js");
const { default: paymentRoutes } = await import("./routes/paymentRoutes.js");
const { default: assetRoutes }   = await import("./routes/assetRoutes.js");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────

app.use(cors({
  origin:      process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Rate limit global
app.use(rateLimit({
  windowMs:        15 * 60 * 1000,
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
app.use("/api/assets",   assetRoutes);

// Compatibilidad con el endpoint original del frontend
app.post("/create_preference", (req, res) =>
  res.redirect(307, "/api/payments/create_preference")
);

// ── Health check ──────────────────────────────────────────
app.get("/health", (_, res) =>
  res.json({ status: "ok", service: "NEON-STITCH API", time: new Date().toISOString() })
);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ message: `Ruta ${req.method} ${req.path} no encontrada.` })
);

// ── Manejador de errores global ───────────────────────────
app.use((err, req, res, _next) => {
  console.error("Error no manejado:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Archivo demasiado grande." });
  }
  if (err.code === "23505") {
    // Unique constraint de Postgres
    return res.status(409).json({ message: "Ya existe un registro con ese valor." });
  }
  if (err.code === "23503") {
    // Foreign key constraint
    return res.status(400).json({ message: "Referencia inválida." });
  }

  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor.",
  });
});

// ── Iniciar ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NEON-STITCH API en puerto ${PORT}`);
  console.log(`📡 Health:    http://localhost:${PORT}/health`);
  console.log(`🔐 Auth:      http://localhost:${PORT}/api/auth`);
  console.log(`👤 Users:     http://localhost:${PORT}/api/users`);
  console.log(`🎨 Designs:   http://localhost:${PORT}/api/designs`);
  console.log(`💳 Payments:  http://localhost:${PORT}/api/payments\n`);
});
