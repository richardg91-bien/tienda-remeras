import { Router } from "express";
import { body } from "express-validator";
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadUserAvatar,
  deleteAvatar,
  getMyOrders,
  deleteAccount,
} from "../controllers/userController.js";
import { lazyProtect } from "./authAdapters.js";

export const createUserRouter = (protect = lazyProtect) => {
  const router = Router();
  router.use(protect);

  router.get("/profile", getProfile);
  router.put("/profile", [
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("phone").optional().matches(/^\+?[\d\s\-()]{7,20}$/).withMessage("Teléfono inválido."),
    body("bio").optional().isLength({ max: 200 }).withMessage("Máximo 200 caracteres."),
    body("address.street").optional().trim(),
    body("address.city").optional().trim(),
    body("address.province").optional().trim(),
    body("address.zip").optional().trim(),
    body("address.country").optional().trim(),
  ], updateProfile);
  router.put("/change-password", [
    body("currentPassword").notEmpty().withMessage("La contraseña actual es obligatoria."),
    body("newPassword")
      .isLength({ min: 8 }).withMessage("Mínimo 8 caracteres.")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage("La contraseña debe tener letras y números."),
  ], changePassword);
  router.post("/avatar", uploadUserAvatar);
  router.delete("/avatar", deleteAvatar);
  router.get("/orders", getMyOrders);
  router.delete("/account", [
    body("password").notEmpty().withMessage("La contraseña es obligatoria para eliminar la cuenta."),
  ], deleteAccount);
  return router;
};

const router = createUserRouter();
export default router;
