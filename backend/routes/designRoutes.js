import { Router } from "express";
import {
  createDesign,
  getPublicDesigns,
  getMyDesigns,
  getDesignById,
  updateDesign,
  deleteDesign,
  likeDesign,
} from "../controllers/designController.js";
import { lazyOptionalAuth, lazyProtect } from "./authAdapters.js";

export const createDesignRouter = ({ protect = lazyProtect, optionalAuth = lazyOptionalAuth } = {}) => {
  const router = Router();
  router.get("/", optionalAuth, getPublicDesigns);
  router.get("/mine", protect, getMyDesigns);
  router.get("/:id", optionalAuth, getDesignById);
  router.post("/", protect, createDesign);
  router.put("/:id", protect, updateDesign);
  router.delete("/:id", protect, deleteDesign);
  router.post("/:id/like", likeDesign);
  return router;
};

const router = createDesignRouter();
export default router;
