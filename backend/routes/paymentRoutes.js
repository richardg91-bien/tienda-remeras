import { Router } from "express";
import {
  createPreference,
  webhook,
  getOrder,
} from "../controllers/paymentController.js";
import { lazyOptionalAuth, lazyProtect } from "./authAdapters.js";

export const createPaymentRouter = ({ protect = lazyProtect, optionalAuth = lazyOptionalAuth } = {}) => {
  const router = Router();
  router.post("/create_preference", optionalAuth, createPreference);
  router.post("/webhook", webhook);
  router.get("/order/:id", protect, getOrder);
  return router;
};

const router = createPaymentRouter();
export default router;
