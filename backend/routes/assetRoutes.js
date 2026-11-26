import { Router } from "express";
import {
  uploadAsset,
  getAssets,
  getAssetById,
  deleteAsset,
  getCategories,
} from "../controllers/assetController.js";
import { lazyOptionalAuth, lazyProtect } from "./authAdapters.js";

export const createAssetRouter = ({ protect = lazyProtect, optionalAuth = lazyOptionalAuth } = {}) => {
  const router = Router();
  router.get("/", optionalAuth, getAssets);
  router.get("/categories", optionalAuth, getCategories);
  router.get("/:id", optionalAuth, getAssetById);
  router.post("/", protect, uploadAsset);
  router.delete("/:id", protect, deleteAsset);
  return router;
};

const router = createAssetRouter();
export default router;
