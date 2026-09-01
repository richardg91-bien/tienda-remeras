import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log("Cloudinary cloud_name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("Supabase URL:", process.env.SUPABASE_URL?.substring(0,40));

const testFile = "C:\\Users\\richa\\OneDrive\\Desktop\\imagenes-pintered-para- tienda-remeras\\descarga.jpg";

console.log("\nSubiendo imagen de prueba...");
try {
  const result = await cloudinary.uploader.upload(testFile, {
    folder: "neon-stitch/pinterest",
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
  });
  console.log("Cloudinary OK:", result.secure_url);

  const { error } = await supabase.from("design_assets").insert({
    name: "Test imagen",
    url: result.secure_url,
    public_id: result.public_id,
    category: "graficos",
    tags: ["retro", "test"],
    is_system: true,
    is_public: true,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  });

  if (error) throw new Error("Supabase error: " + error.message);
  console.log("Supabase OK — imagen guardada en el banco");

} catch(e) {
  console.error("ERROR:", e.message);
}
