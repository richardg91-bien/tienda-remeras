import { Router } from "express";
import { getProductModel, getProductModels } from "../controllers/productModelController.js";

const router = Router();
router.get("/models", getProductModels);
router.get("/models/:id", getProductModel);
export default router;
