import { Router } from "express";
import { body }   from "express-validator";
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadUserAvatar,
  deleteAvatar,
  getMyOrders,
  deleteAccount,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Todas las rutas de usuario requieren autenticación
router.use(protect);

// ── Perfil ────────────────────────────────────────────────
// GET  /api/users/profile
router.get("/profile", getProfile);

// PUT  /api/users/profile
router.put(
  "/profile",
  [
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("phone").optional().matches(/^\+?[\d\s\-()]{7,20}$/).withMessage("Teléfono inválido."),
    body("bio").optional().isLength({ max: 200 }).withMessage("Máximo 200 caracteres."),
    body("address.street").optional().trim(),
    body("address.city").optional().trim(),
    body("address.province").optional().trim(),
    body("address.zip").optional().trim(),
    body("address.country").optional().trim(),
  ],
  updateProfile
);

// ── Contraseña ────────────────────────────────────────────
// PUT  /api/users/change-password
router.put(
  "/change-password",
  [
    body("currentPassword").notEmpty().withMessage("La contraseña actual es obligatoria."),
    body("newPassword")
      .isLength({ min: 8 }).withMessage("Mínimo 8 caracteres.")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage("La contraseña debe tener letras y números."),
  ],
  changePassword
);

// ── Avatar ────────────────────────────────────────────────
// POST   /api/users/avatar    (multipart/form-data, campo: "avatar")
router.post("/avatar", uploadUserAvatar);

// DELETE /api/users/avatar
router.delete("/avatar", deleteAvatar);

// ── Órdenes ───────────────────────────────────────────────
// GET  /api/users/orders?page=1&limit=10
router.get("/orders", getMyOrders);

// ── Cuenta ───────────────────────────────────────────────
// DELETE /api/users/account  (requiere password en el body)
router.delete(
  "/account",
  [body("password").notEmpty().withMessage("La contraseña es obligatoria para eliminar la cuenta.")],
  deleteAccount
);

export default router;
