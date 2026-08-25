import supabase from "../config/supabase.js";
import { cloudinary, uploadDesign, uploadToCloudinary } from "../config/cloudinary.js";

// ── POST /api/assets ──────────────────────────────────────────────────────────
export const uploadAsset = [
  (req, res, next) => uploadDesign.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Se requiere una imagen." });

      const { name, category = "general", tags, isSystem = false, isPublic = true } = req.body;

      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "neon-stitch/assets",
        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
      });

      const tagsArr = tags
        ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim().toLowerCase()))
        : [];

      const { data: asset, error } = await supabase
        .from("design_assets")
        .insert({
          name:        name || req.file.originalname || "Sin nombre",
          url:         result.url,
          public_id:   result.publicId,
          category,
          tags:        tagsArr,
          is_system:   isSystem === "true" || isSystem === true,
          is_public:   isPublic === "true"  || isPublic  === true,
          uploaded_by: req.user?.id || null,
          width:       result.width,
          height:      result.height,
          format:      result.format,
          bytes:       result.bytes,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ message: "Imagen subida al banco.", asset });
    } catch (error) {
      console.error("uploadAsset error:", error);
      return res.status(500).json({ message: "Error subiendo imagen." });
    }
  },
];

// ── GET /api/assets ───────────────────────────────────────────────────────────
export const getAssets = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 24);
    const category = req.query.category || null;
    const search   = req.query.search   || null;
    const from     = (page - 1) * limit;
    const to       = from + limit - 1;

    let query = supabase
      .from("design_assets")
      .select("*", { count: "exact" })
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (category) query = query.eq("category", category);
    if (req.query.tags) query = query.overlaps("tags", req.query.tags.split(","));
    if (search) query = query.ilike("name", `%${search}%`);

    const { data: assets, count, error } = await query;
    if (error) throw error;

    return res.json({
      assets,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error("getAssets error:", error);
    return res.status(500).json({ message: "Error obteniendo imágenes." });
  }
};

// ── GET /api/assets/:id ───────────────────────────────────────────────────────
export const getAssetById = async (req, res) => {
  try {
    const { data: asset, error } = await supabase
      .from("design_assets")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!asset) return res.status(404).json({ message: "Imagen no encontrada." });

    return res.json({ asset });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo imagen." });
  }
};

// ── DELETE /api/assets/:id ────────────────────────────────────────────────────
export const deleteAsset = async (req, res) => {
  try {
    const { data: asset } = await supabase
      .from("design_assets")
      .select("public_id, uploaded_by, is_system")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!asset) return res.status(404).json({ message: "Imagen no encontrada." });

    const isOwner = asset.uploaded_by === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No podés eliminar esta imagen." });
    }

    if (asset.public_id) await cloudinary.uploader.destroy(asset.public_id);

    const { error } = await supabase
      .from("design_assets")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    return res.json({ message: "Imagen eliminada del banco." });
  } catch (error) {
    console.error("deleteAsset error:", error);
    return res.status(500).json({ message: "Error eliminando imagen." });
  }
};

// ── GET /api/assets/categories ────────────────────────────────────────────────
// Devuelve todas las categorías con conteo de imágenes
export const getCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("design_assets")
      .select("category")
      .eq("is_public", true);

    if (error) throw error;

    const counts = data.reduce((acc, { category }) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const categories = [
      { value: "todos",        label: "Todos" },
      { value: "logos",        label: "Logos" },
      { value: "iconos",       label: "Íconos" },
      { value: "graficos",     label: "Gráficos" },
      { value: "texturas",     label: "Texturas" },
      { value: "streetwear",   label: "Streetwear" },
      { value: "cyberpunk",    label: "Cyberpunk" },
      { value: "minimalista",  label: "Minimalista" },
      { value: "general",      label: "General" },
    ].map((c) => ({ ...c, count: counts[c.value] || 0 }));

    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo categorías." });
  }
};
