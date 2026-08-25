/**
 * Script para poblar el banco de imágenes
 * Descarga imágenes de diseño y las sube a Cloudinary + Supabase
 *
 * Uso: node scripts/seedAssets.js
 * (desde la carpeta backend/)
 */

import dotenv from "dotenv";
dotenv.config();

const { default: supabase }      = await import("../config/supabase.js");
const { cloudinary }              = await import("../config/cloudinary.js");

// ── Imágenes a subir ──────────────────────────────────────
// URLs de imágenes libres de derechos para diseño de remeras
const ASSETS = [
  // ── Streetwear ──
  {
    name:     "Graffiti Tag Negro",
    url:      "https://images.unsplash.com/photo-1569880153113-76e33fc52d5f?w=800&q=85",
    category: "streetwear",
    tags:     ["graffiti","urbano","negro","street"],
  },
  {
    name:     "Calavera Urbana",
    url:      "https://images.unsplash.com/photo-1503455637927-730bce583c0?w=800&q=85",
    category: "streetwear",
    tags:     ["calavera","urbano","dark","street"],
  },
  {
    name:     "Skate Board Vintage",
    url:      "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800&q=85",
    category: "streetwear",
    tags:     ["skate","vintage","urbano"],
  },

  // ── Cyberpunk ──
  {
    name:     "Circuito Neon",
    url:      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=85",
    category: "cyberpunk",
    tags:     ["circuito","neon","tech","cyberpunk"],
  },
  {
    name:     "Glitch Digital",
    url:      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=85",
    category: "cyberpunk",
    tags:     ["glitch","digital","tech","cyber"],
  },
  {
    name:     "Neon City",
    url:      "https://images.unsplash.com/photo-1545987796-200677ee1011?w=800&q=85",
    category: "cyberpunk",
    tags:     ["neon","ciudad","luces","cyber"],
  },

  // ── Minimalista ──
  {
    name:     "Triángulo Minimal",
    url:      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85",
    category: "minimalista",
    tags:     ["triangulo","minimal","geometrico","simple"],
  },
  {
    name:     "Líneas Abstractas",
    url:      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=85",
    category: "minimalista",
    tags:     ["lineas","abstracto","minimal","blanco"],
  },
  {
    name:     "Punto y Línea",
    url:      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85",
    category: "minimalista",
    tags:     ["minimal","punto","linea","simple"],
  },

  // ── Logos / Íconos ──
  {
    name:     "Relámpago Blanco",
    url:      "https://images.unsplash.com/photo-1589652717521-10c0d092dea9?w=800&q=85",
    category: "iconos",
    tags:     ["relampago","energia","icon","blanco"],
  },
  {
    name:     "Flor de Lis",
    url:      "https://images.unsplash.com/photo-1490750967868-88df5691cc88?w=800&q=85",
    category: "logos",
    tags:     ["flor","ornamento","vintage","elegante"],
  },
  {
    name:     "Rosa Oscura",
    url:      "https://images.unsplash.com/photo-1559181567-c3190bffc011?w=800&q=85",
    category: "graficos",
    tags:     ["rosa","flor","oscuro","naturaleza"],
  },

  // ── Gráficos ──
  {
    name:     "Ola Japonesa",
    url:      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=85",
    category: "graficos",
    tags:     ["ola","japones","arte","tradicional"],
  },
  {
    name:     "León Rugiente",
    url:      "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&q=85",
    category: "graficos",
    tags:     ["leon","animal","fuerza","salvaje"],
  },
  {
    name:     "Lobo Nocturno",
    url:      "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&q=85",
    category: "graficos",
    tags:     ["lobo","animal","noche","salvaje"],
  },

  // ── Texturas ──
  {
    name:     "Textura Mármol Negro",
    url:      "https://images.unsplash.com/photo-1558618047-f4e60cfd3f5b?w=800&q=85",
    category: "texturas",
    tags:     ["marmol","negro","textura","elegante"],
  },
  {
    name:     "Textura Carbono",
    url:      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85",
    category: "texturas",
    tags:     ["carbono","textura","oscuro","tech"],
  },
  {
    name:     "Humo Blanco",
    url:      "https://images.unsplash.com/photo-1517873623817-5e5efa291f9b?w=800&q=85",
    category: "texturas",
    tags:     ["humo","blanco","suave","abstracto"],
  },
];

// ── Función principal ─────────────────────────────────────
async function seedAssets() {
  console.log("\n🎨 Iniciando carga del banco de imágenes...\n");

  let ok = 0;
  let fail = 0;

  for (const asset of ASSETS) {
    try {
      process.stdout.write(`  Subiendo: ${asset.name}... `);

      // Sube a Cloudinary desde URL
      const result = await cloudinary.uploader.upload(asset.url, {
        folder:         "neon-stitch/assets",
        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        resource_type:  "image",
      });

      // Guarda en Supabase
      const { error } = await supabase.from("design_assets").insert({
        name:       asset.name,
        url:        result.secure_url,
        public_id:  result.public_id,
        category:   asset.category,
        tags:       asset.tags,
        is_system:  true,
        is_public:  true,
        width:      result.width,
        height:     result.height,
        format:     result.format,
        bytes:      result.bytes,
      });

      if (error) throw error;

      console.log(`✅`);
      ok++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      fail++;
    }

    // Pausa entre uploads para no saturar la API
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n── Resultado ──────────────────────`);
  console.log(`✅ Subidas correctamente: ${ok}`);
  console.log(`❌ Fallidas:              ${fail}`);
  console.log(`📦 Total en banco:        ${ok}\n`);

  process.exit(0);
}

seedAssets();
