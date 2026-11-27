import { Router } from "express";
import { lazyProtect } from "./authAdapters.js";
import { uploadDesign } from "../config/cloudinary.js";
import { createPrivateAssetHandlers } from "../controllers/projectController.js";

export const createPrivateAssetRouter = ({
  authMiddleware = lazyProtect,
  uploader = uploadDesign,
  handlers = createPrivateAssetHandlers(),
} = {}) => {
  const router = Router();
  router.use(authMiddleware);
  router.get("/", handlers.listPrivateAssets);
  router.post("/", (req, res, next) => uploader.single("image")(req, res, (error) => error ? res.status(400).json({ message: error.message }) : next()), handlers.uploadPrivateAsset);
  router.get("/file", handlers.getPrivateAssetUrl);
  return router;
};

const router = createPrivateAssetRouter();
export default router;
