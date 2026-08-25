import { Router } from "express";
import {
  uploadAsset,
  getAssets,
  getAssetById,
  deleteAsset,
  getCategories,
} from "../controllers/assetController.js";
import { protect, optionalAuth } from "../middleware/auth.js";

const router = Router();

// Públicas — cualquiera puede ver el banco
router.get("/",              optionalAuth, getAssets);
router.get("/categories",    optionalAuth, getCategories);
router.get("/:id",           optionalAuth, getAssetById);

// Requiere login
router.post("/",             protect, uploadAsset);
router.delete("/:id",        protect, deleteAsset);

export default router;
