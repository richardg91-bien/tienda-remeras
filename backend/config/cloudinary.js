import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// ── Configuración de Cloudinary ──────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Storage para diseños de remeras ─────────────────────
const designStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "neon-stitch/designs",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [
      { width: 1200, height: 1200, crop: "limit", quality: "auto" },
    ],
  },
});

// ── Storage para avatares de usuario ─────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "neon-stitch/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" },
    ],
  },
});

// ── Límites de tamaño ─────────────────────────────────────
const LIMITS = {
  designs: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  avatars: { fileSize: 2 * 1024 * 1024  }, // 2 MB
};

// ── Filtro de tipos de archivo ────────────────────────────
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes (jpg, png, webp, svg)"), false);
  }
};

// ── Instancias de multer exportadas ──────────────────────
export const uploadDesign = multer({
  storage: designStorage,
  limits:  LIMITS.designs,
  fileFilter: imageFilter,
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  LIMITS.avatars,
  fileFilter: imageFilter,
});

// Exporta cloudinary para usarlo en controllers (eliminar, etc.)
export { cloudinary };
