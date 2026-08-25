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

const ASSETS = [
  { name: "Graffiti Tag Negro",   url: "https://images.unsplash.com/photo-1569880153113-76e33fc52d5f?w=800&q=85", category: "streetwear",  tags: ["graffiti","urbano","street"] },
  { name: "Skate Board Vintage",  url: "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800&q=85",  category: "streetwear",  tags: ["skate","vintage","urbano"] },
  { name: "Hip Hop Abstract",     url: "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=800&q=85", category: "streetwear",  tags: ["hiphop","abstracto","urbano"] },
  { name: "Circuito Neon",        url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=85", category: "cyberpunk",   tags: ["circuito","neon","tech"] },
  { name: "Glitch Digital",       url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=85",  category: "cyberpunk",   tags: ["glitch","digital","cyber"] },
  { name: "Neon City Lights",     url: "https://images.unsplash.com/photo-1545987796-200677ee1011?w=800&q=85",  category: "cyberpunk",   tags: ["neon","ciudad","luces"] },
  { name: "Matrix Code",          url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=85", category: "cyberpunk",   tags: ["matrix","codigo","tech"] },
  { name: "Triangulo Minimal",    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85",  category: "minimalista", tags: ["triangulo","minimal","geometrico"] },
  { name: "Lineas Abstractas",    url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=85", category: "minimalista", tags: ["lineas","abstracto","minimal"] },
  { name: "Formas Geometricas",   url: "https://images.unsplash.com/photo-1509909756405-be0199881695?w=800&q=85", category: "minimalista", tags: ["geometrico","minimal","formas"] },
  { name: "Ola Japonesa",         url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=85", category: "graficos",    tags: ["ola","japones","arte"] },
  { name: "Leon Rugiente",        url: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&q=85",  category: "graficos",    tags: ["leon","animal","fuerza"] },
  { name: "Lobo Nocturno",        url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&q=85", category: "graficos",    tags: ["lobo","animal","noche"] },
  { name: "Rosa Oscura",          url: "https://images.unsplash.com/photo-1559181567-c3190bffc011?w=800&q=85",  category: "graficos",    tags: ["rosa","flor","oscuro"] },
  { name: "Aguila Imperial",      url: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800&q=85", category: "graficos",    tags: ["aguila","imperial","fuerza"] },
  { name: "Textura Marmol Negro", url: "https://images.unsplash.com/photo-1558618047-f4e60cfd3f5b?w=800&q=85",  category: "texturas",    tags: ["marmol","negro","textura"] },
  { name: "Humo Blanco",          url: "https://images.unsplash.com/photo-1517873623817-5e5efa291f9b?w=800&q=85", category: "texturas",    tags: ["humo","blanco","abstracto"] },
  { name: "Textura Oscura",       url: "https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=85",  category: "texturas",    tags: ["oscuro","textura","degradado"] },
  { name: "Relampago Icon",       url: "https://images.unsplash.com/photo-1536514498073-50e69d39c6cf?w=800&q=85", category: "iconos",      tags: ["relampago","energia","icon"] },
  { name: "Flor Vintage",         url: "https://images.unsplash.com/photo-1490750967868-88df5691cc88?w=800&q=85", category: "logos",       tags: ["flor","vintage","ornamento"] },
];

console.log("\n🎨 Cargando banco de imagenes NEON-STITCH...\n");
let ok = 0; let fail = 0;

for (const asset of ASSETS) {
  try {
    process.stdout.write(`  [${String(ASSETS.indexOf(asset)+1).padStart(2,"0")}/${ASSETS.length}] ${asset.name}... `);

    // Sube imagen a Cloudinary
    const result = await cloudinary.uploader.upload(asset.url, {
      folder:         "neon-stitch/assets",
      transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    });

    // Guarda en Supabase
    const { error } = await supabase.from("design_assets").insert({
      name:      asset.name,
      url:       result.secure_url,
      public_id: result.public_id,
      category:  asset.category,
      tags:      asset.tags,
      is_system: true,
      is_public: true,
      width:     result.width,
      height:    result.height,
      format:    result.format,
      bytes:     result.bytes,
    });

    if (error) throw error;

    console.log(`✅  →  ${result.secure_url.split("/").pop()}`);
    ok++;
  } catch (err) {
    console.log(`❌  ${err.message}`);
    fail++;
  }

  // Pausa para no saturar la API de Cloudinary
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\n${"─".repeat(50)}`);
console.log(`✅  Subidas correctamente : ${ok}`);
console.log(`❌  Fallidas              : ${fail}`);
console.log(`📦  Total en el banco     : ${ok}`);
console.log(`${"─".repeat(50)}\n`);
