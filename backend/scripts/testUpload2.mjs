// Mantiene el proceso vivo explícitamente
const keepAlive = setInterval(() => {}, 60000);

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

console.log("Config OK:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("Intentando upload...");

const testFile = "C:\\Users\\richa\\OneDrive\\Desktop\\imagenes-pintered-para- tienda-remeras\\descarga.jpg";

cloudinary.uploader.upload(testFile, { folder: "neon-stitch/test" })
  .then((r) => {
    console.log("Upload OK:", r.secure_url);
    clearInterval(keepAlive);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Upload ERROR:", e.message);
    clearInterval(keepAlive);
    process.exit(1);
  });

console.log("Upload iniciado, esperando respuesta...");
