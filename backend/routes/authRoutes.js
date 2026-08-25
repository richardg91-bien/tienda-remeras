import { Router } from "express";
import { body }   from "express-validator";
import rateLimit  from "express-rate-limit";
import { register, login, refresh, me, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// ── Rate limits ───────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max:      10,
  message:  { message: "Demasiados intentos. Esperá 15 minutos." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Validaciones ──────────────────────────────────────────
const registerValidation = [
  body("firstName")
    .trim().notEmpty().withMessage("El nombre es obligatorio.")
    .isLength({ max: 50 }).withMessage("Máximo 50 caracteres."),
  body("lastName")
    .trim().notEmpty().withMessage("El apellido es obligatorio.")
    .isLength({ max: 50 }).withMessage("Máximo 50 caracteres."),
  body("email")
    .isEmail().withMessage("Email inválido.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres.")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage("La contraseña debe tener letras y números."),
  body("phone")
    .optional()
    .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage("Teléfono inválido."),
];

const loginValidation = [
  body("email").isEmail().withMessage("Email inválido.").normalizeEmail(),
  body("password").notEmpty().withMessage("La contraseña es obligatoria."),
];

// ── Rutas ─────────────────────────────────────────────────
// POST /api/auth/register
router.post("/register", authLimiter, registerValidation, register);

// POST /api/auth/login
router.post("/login", authLimiter, loginValidation, login);

// POST /api/auth/refresh   — renueva access token con refresh token (cookie)
router.post("/refresh", refresh);

// GET  /api/auth/me        — devuelve el usuario autenticado
router.get("/me", protect, me);

// POST /api/auth/logout    — revoca el refresh token
router.post("/logout", protect, logout);

export default router;
