/**
 * Sube todas las imágenes de Pinterest al banco NEON-STITCH
 * Usa axios + FormData para compatibilidad con Node.js v24
 * Uso: node scripts/uploadPinterest.mjs
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdirSync, readFileSync, statSync } from "fs";
import { extname, basename, resolve } from "path";
import { createHash } from "crypto";
import axios from "axios";
import FormData from "form-data";

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

// Genera firma para Cloudinary
function sign(params) {
  const str = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`).join("&");
  return createHash("sha256").update(str + API_SECRET).digest("hex");
}

// Upload a Cloudinary usando axios + form-data
async function uploadCloudinary(filePath) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = "neon-stitch/pinterest";
  const signature = sign({ folder, timestamp });

  const ext      = extname(filePath).toLowerCase().replace(".", "");
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const form = new FormData();
  form.append("file",      readFileSync(filePath), { filename: basename(filePath), contentType: mimeType });
  form.append("folder",    folder);
  form.append("timestamp", String(timestamp));
  form.append("api_key",   API_KEY);
  form.append("signature", signature);

  const res = await axios.post(UPLOAD_URL, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30000,
  });
  return res.data;
}

// ── Main ──────────────────────────────────────────────────
const FOLDER = "C:\\Users\\richa\\OneDrive\\Desktop\\imagenes-pintered-para- tienda-remeras";
const EXTS   = [".jpg", ".jpeg", ".png", ".webp"];

const files = readdirSync(FOLDER)
  .filter(f => EXTS.includes(extname(f).toLowerCase()))
  .filter(f => statSync(join(FOLDER, f)).isFile());

console.log(`\n🎨 NEON-STITCH — Banco de imágenes Pinterest`);
console.log(`📁 ${FOLDER}`);
console.log(`🖼  ${files.length} imágenes encontradas\n`);

let ok = 0; let fail = 0;

for (let i = 0; i < files.length; i++) {
  const file     = files[i];
  const filePath = join(FOLDER, file);
  const name     = basename(file, extname(file)).substring(0, 79);
  const num      = String(i + 1).padStart(2, "0");
  const label    = name.substring(0, 42).padEnd(42);

  process.stdout.write(`[${num}/${files.length}] ${label}... `);

  try {
    const result = await uploadCloudinary(filePath);

    const { error } = await supabase.from("design_assets").insert({
      name,
      url:       result.secure_url,
      public_id: result.public_id,
      category:  "graficos",
      tags:      ["retro", "vintage", "cartoon", "diseño"],
      is_system: true,
      is_public: true,
      width:     result.width,
      height:    result.height,
      format:    result.format,
      bytes:     result.bytes,
    });

    if (error) throw new Error("Supabase: " + error.message);

    console.log("✅");
    ok++;
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.log(`❌  ${msg.substring(0, 55)}`);
    fail++;
  }

  // Pausa para no saturar Cloudinary
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n${"─".repeat(55)}`);
console.log(`✅  Subidas correctamente : ${ok}`);
console.log(`❌  Fallidas              : ${fail}`);
console.log(`📦  Total en el banco     : ${ok} / ${files.length}`);
console.log(`${"─".repeat(55)}\n`);
