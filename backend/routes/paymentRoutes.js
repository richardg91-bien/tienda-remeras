import { Router } from "express";
import {
  createPreference,
  webhook,
  getOrder,
} from "../controllers/paymentController.js";
import { protect, optionalAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/payments/create_preference
// Funciona para usuarios autenticados y guests
router.post("/create_preference", optionalAuth, createPreference);

// POST /api/payments/webhook  (MercadoPago llama aquí)
// Sin autenticación — MP envía su propia firma
router.post("/webhook", webhook);

// GET /api/payments/order/:id
router.get("/order/:id", protect, getOrder);

// Mantiene compatibilidad con el endpoint anterior /create_preference
export default router;
