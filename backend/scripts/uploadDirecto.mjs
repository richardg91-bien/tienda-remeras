/**
 * Sube imágenes directamente a Cloudinary via API REST (sin SDK)
 * compatible con Node.js v24
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdirSync, readFileSync } from "fs";
import { extname, basename } from "path";
import { createHmac, createHash } from "crypto";
import FormData from "form-data";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../.env") });

// Importa supabase
const { createClient } = await import("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY      = process.env.CLOUDINARY_API_KEY;
const API_SECRET   = process.env.CLOUDINARY_API_SECRET;
const UPLOAD_URL   = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// Firma para Cloudinary
function signRequest(params) {
  const sorted = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha256").update(sorted + API_SECRET).digest("hex");
}

// Sube un archivo a Cloudinary via REST
async function uploadToCloudinary(filePath, folder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params    = { folder, timestamp };
  const sorted    = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join("&");
  const signature = createHash("sha256").update(sorted + API_SECRET).digest("hex");

  const fileBuffer = readFileSync(filePath);
  const ext        = extname(filePath).toLowerCase().replace(".","");
  const mimeType   = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  // Usa FormData nativo de Node 18+
  const fd = new globalThis.FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  fd.append("file",      blob, basename(filePath));
  fd.append("folder",    folder);
  fd.append("timestamp", String(timestamp));
  fd.append("api_key",   API_KEY);
  fd.append("signature", signature);

  const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Cloudinary error");
  }
  return res.json();
}

// ── Main ──────────────────────────────────────────────────
const FOLDER  = "C:\\Users\\richa\\OneDrive\\Desktop\\imagenes-pintered-para- tienda-remeras";
const EXTS    = [".jpg",".jpeg",".png",".webp"];
const files   = readdirSync(FOLDER).filter(f => EXTS.includes(extname(f).toLowerCase()));

console.log(`\n🎨 NEON-STITCH — Banco de imágenes`);
console.log(`🖼  ${files.length} imágenes encontradas\n`);

let ok = 0; let fail = 0;

for (let i = 0; i < files.length; i++) {
  const file     = files[i];
  const filePath = join(FOLDER, file);
  const name     = basename(file, extname(file)).substring(0, 79);
  const num      = String(i+1).padStart(2,"0");

  process.stdout.write(`[${num}/${files.length}] ${name.substring(0,45).padEnd(45)}... `);

  try {
    const result = await uploadToCloudinary(filePath, "neon-stitch/pinterest");

    const { error } = await supabase.from("design_assets").insert({
      name,
      url:       result.secure_url,
      public_id: result.public_id,
      category:  "graficos",
      tags:      ["retro","vintage","cartoon","diseño"],
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
  } catch(e) {
    console.log(`❌  ${e.message.substring(0,50)}`);
    fail++;
  }

  await new Promise(r => setTimeout(r, 400));
}

console.log(`\n${"─".repeat(55)}`);
console.log(`✅  Subidas : ${ok}`);
console.log(`❌  Fallidas: ${fail}`);
console.log(`📦  Total   : ${ok}/${files.length}`);
console.log(`${"─".repeat(55)}\n`);
