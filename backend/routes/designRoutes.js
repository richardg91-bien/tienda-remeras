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
import { protect, optionalAuth } from "../middleware/auth.js";

const router = Router();

// ── Galería pública ───────────────────────────────────────
// GET /api/designs?page=1&limit=12&category=cyberpunk&tags=neon,glitch
router.get("/", optionalAuth, getPublicDesigns);

// ── Diseños del usuario autenticado ──────────────────────
// GET /api/designs/mine
router.get("/mine", protect, getMyDesigns);

// ── CRUD de un diseño específico ─────────────────────────
// GET /api/designs/:id
router.get("/:id", optionalAuth, getDesignById);

// POST /api/designs  (multipart/form-data, campo: "image")
// Campos adicionales en el body:
//   title, description, tags (string csv), category, isPublic
router.post("/", protect, createDesign);

// PUT /api/designs/:id
router.put("/:id", protect, updateDesign);

// DELETE /api/designs/:id
router.delete("/:id", protect, deleteDesign);

// POST /api/designs/:id/like
router.post("/:id/like", likeDesign);

export default router;
