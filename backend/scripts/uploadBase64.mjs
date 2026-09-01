/**
 * Sube imágenes a Cloudinary usando base64 data URI
 * Más compatible con Node.js v24
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdirSync, readFileSync, statSync } from "fs";
import { extname, basename } from "path";
import axios from "axios";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });

const { createClient } = await import("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

async function uploadFile(filePath) {
  const ext      = extname(filePath).toLowerCase().replace(".", "");
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const b64      = readFileSync(filePath).toString("base64");
  const dataUri  = `data:${mimeType};base64,${b64}`;

  const params = new URLSearchParams();
  params.append("file",    dataUri);
  params.append("folder",  "neon-stitch/pinterest");
  params.append("api_key", API_KEY);
  params.append("upload_preset", "ml_default");

  const res = await axios.post(UPLOAD_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 60000,
    maxBodyLength: Infinity,
  });
  return res.data;
}

// ── Main ─────────────────────────────────────────────────
const FOLDER = "C:\\Users\\richa\\OneDrive\\Desktop\\imagenes-pintered-para- tienda-remeras";
const EXTS   = [".jpg", ".jpeg", ".png", ".webp"];
const files  = readdirSync(FOLDER)
  .filter(f => EXTS.includes(extname(f).toLowerCase()))
  .filter(f => statSync(join(FOLDER, f)).isFile());

console.log(`\n🎨 NEON-STITCH — Banco Pinterest`);
console.log(`🖼  ${files.length} imágenes\n`);

let ok = 0; let fail = 0;

for (let i = 0; i < files.length; i++) {
  const file     = files[i];
  const filePath = join(FOLDER, file);
  const name     = basename(file, extname(file)).substring(0, 79);
  process.stdout.write(`[${i+1}/${files.length}] ${name.substring(0,40).padEnd(40)}... `);

  try {
    const result = await uploadFile(filePath);
    const { error } = await supabase.from("design_assets").insert({
      name,
      url:       result.secure_url,
      public_id: result.public_id,
      category:  "graficos",
      tags:      ["retro", "vintage", "cartoon"],
      is_system: true,
      is_public: true,
      width:     result.width,
      height:    result.height,
      format:    result.format,
      bytes:     result.bytes,
    });
    if (error) throw new Error(error.message);
    console.log("✅");
    ok++;
  } catch(e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.log(`❌  ${msg.substring(0, 50)}`);
    fail++;
  }
  await new Promise(r => setTimeout(r, 600));
}

console.log(`\n✅ Subidas: ${ok}  ❌ Fallidas: ${fail}  📦 Total: ${ok}/${files.length}\n`);
