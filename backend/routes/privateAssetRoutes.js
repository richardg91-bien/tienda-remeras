import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { uploadDesign } from "../config/cloudinary.js";
import { getPrivateAssetUrl, listPrivateAssets, uploadPrivateAsset } from "../controllers/projectController.js";

const router = Router();
router.use(protect);
router.get("/", listPrivateAssets);
router.post("/", (req, res, next) => uploadDesign.single("image")(req, res, (error) => error ? res.status(400).json({ message: error.message }) : next()), uploadPrivateAsset);
router.get("/file", getPrivateAssetUrl);
export default router;
