/**
 * Trae todas las imágenes de Cloudinary y las registra en Supabase
 * Uso: node scripts/syncFromCloudinary.mjs
 */

// Lee el .env manualmente sin depender de dotenv
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir  = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "../.env");

// Parsea el .env manualmente
try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch(e) {
  console.error("No se pudo leer .env:", e.message);
}

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Trae recursos de Cloudinary via API REST con autenticación básica
async function getCloudinaryResources(nextCursor = null) {
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  let url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image?max_results=100`;
  if (nextCursor) url += `&next_cursor=${nextCursor}`;

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.json();
}

// Mapea el nombre del archivo a una categoría
function getCategory(publicId) {
  const name = publicId.toLowerCase();
  if (name.includes("cyberpunk") || name.includes("neon") || name.includes("circuit")) return "cyberpunk";
  if (name.includes("minimal") || name.includes("linea") || name.includes("simple")) return "minimalista";
  if (name.includes("street") || name.includes("skate") || name.includes("graffiti")) return "streetwear";
  if (name.includes("logo") || name.includes("icon")) return "logos";
  if (name.includes("textura") || name.includes("marmol") || name.includes("humo")) return "texturas";
  return "graficos"; // default para los de Pinterest (retro/cartoon)
}

// ── Main ──────────────────────────────────────────────────
console.log("\n🎨 Sincronizando Cloudinary → Supabase...\n");

let allResources = [];
let nextCursor   = null;

// Trae TODAS las imágenes (paginado)
do {
  const data = await getCloudinaryResources(nextCursor);
  if (data.error) {
    console.error("Error Cloudinary:", data.error.message);
    process.exit(1);
  }
  allResources = [...allResources, ...(data.resources || [])];
  nextCursor   = data.next_cursor || null;
  console.log(`  Cargadas ${allResources.length} imágenes de Cloudinary...`);
} while (nextCursor);

console.log(`\n📦 Total en Cloudinary: ${allResources.length}`);

// Verifica cuáles ya están en Supabase para no duplicar
const { data: existing } = await supabase
  .from("design_assets")
  .select("public_id");

const existingIds = new Set((existing || []).map(r => r.public_id));
const toInsert    = allResources.filter(r => !existingIds.has(r.public_id));

console.log(`✅ Ya en Supabase:  ${existingIds.size}`);
console.log(`🆕 Para insertar:  ${toInsert.length}\n`);

if (toInsert.length === 0) {
  console.log("Todo ya está sincronizado.\n");
  process.exit(0);
}

// Inserta en Supabase en batches de 20
let ok = 0; let fail = 0;
const BATCH = 20;

for (let i = 0; i < toInsert.length; i += BATCH) {
  const batch = toInsert.slice(i, i + BATCH);

  const rows = batch.map(r => ({
    name:      r.public_id.split("/").pop().replace(/\.[^.]+$/, "").replace(/-/g, " "),
    url:       r.secure_url,
    public_id: r.public_id,
    category:  getCategory(r.public_id),
    tags:      ["retro", "vintage", "diseño", "pinterest"],
    is_system: true,
    is_public: true,
    width:     r.width,
    height:    r.height,
    format:    r.format,
    bytes:     r.bytes,
  }));

  const { error } = await supabase.from("design_assets").insert(rows);

  if (error) {
    console.log(`❌ Batch ${Math.floor(i/BATCH)+1}: ${error.message}`);
    fail += batch.length;
  } else {
    console.log(`✅ Batch ${Math.floor(i/BATCH)+1}: ${batch.length} imágenes insertadas`);
    ok += batch.length;
  }
}

console.log(`\n${"─".repeat(45)}`);
console.log(`✅ Insertadas en Supabase: ${ok}`);
console.log(`❌ Fallidas:               ${fail}`);
console.log(`📦 Total en banco ahora:   ${existingIds.size + ok}`);
console.log(`${"─".repeat(45)}\n`);
