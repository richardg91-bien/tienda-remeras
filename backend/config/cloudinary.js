import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// ── Configuración de Cloudinary ──────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Multer: almacena en memoria (buffer) ─────────────────
// El controller sube manualmente a Cloudinary con upload_stream
const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes (jpg, png, webp, svg)"), false);
  }
};

// Uploader para diseños (10 MB)
export const uploadDesign = multer({
  storage:    memoryStorage,
  limits:     { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// Uploader para avatares (2 MB)
export const uploadAvatar = multer({
  storage:    memoryStorage,
  limits:     { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

/**
 * Sube un buffer a Cloudinary y devuelve { url, publicId, width, height, format, bytes }
 * @param {Buffer} buffer
 * @param {object} options  — folder, transformation, etc.
 */
export const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve({
        url:      result.secure_url,
        publicId: result.public_id,
        width:    result.width,
        height:   result.height,
        format:   result.format,
        bytes:    result.bytes,
      });
    });
    stream.end(buffer);
  });

export { cloudinary };
