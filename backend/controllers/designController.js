import { validationResult } from "express-validator";
import supabase  from "../config/supabase.js";
import { cloudinary, uploadDesign, uploadToCloudinary } from "../config/cloudinary.js";

// ── POST /api/designs ─────────────────────────────────────────────────────────
export const createDesign = [
  (req, res, next) => uploadDesign.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Se requiere una imagen." });

      const { title, description, tags, category, isPublic } = req.body;

      // Sube a Cloudinary
      const imageResult = await uploadToCloudinary(req.file.buffer, {
        folder:         "neon-stitch/designs",
        transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
      });

      // Normaliza tags
      const tagsArr = tags
        ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim().toLowerCase()))
        : [];

      const { data: design, error } = await supabase
        .from("designs")
        .insert({
          owner_id:        req.user.id,
          image_url:       imageResult.url,
          image_public_id: imageResult.publicId,
          image_meta:      {
            width:  imageResult.width,
            height: imageResult.height,
            format: imageResult.format,
            bytes:  imageResult.bytes,
          },
          title:       title || "Sin título",
          description: description || "",
          tags:        tagsArr,
          category:    category || "otro",
          is_public:   isPublic === "true" || isPublic === true,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ message: "Diseño subido exitosamente.", design });
    } catch (error) {
      console.error("createDesign error:", error);
      return res.status(500).json({ message: "Error subiendo diseño." });
    }
  },
];

// ── GET /api/designs — Galería pública ────────────────────────────────────────
export const getPublicDesigns = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 12);
    const category = req.query.category || null;
    const from     = (page - 1) * limit;
    const to       = from + limit - 1;

    let query = supabase
      .from("designs")
      .select(`
        id, title, description, tags, category,
        image_url, image_meta, likes, views, created_at,
        owner:owner_id ( id, first_name, last_name, avatar_url )
      `, { count: "exact" })
      .eq("is_public", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (category) query = query.eq("category", category);

    // Filtro por tags (contiene al menos uno)
    if (req.query.tags) {
      const tagsArr = req.query.tags.split(",").map((t) => t.trim());
      query = query.overlaps("tags", tagsArr);
    }

    const { data: designs, count, error } = await query;
    if (error) throw error;

    return res.json({
      designs,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error("getPublicDesigns error:", error);
    return res.status(500).json({ message: "Error obteniendo diseños." });
  }
};

// ── GET /api/designs/mine — Mis diseños ───────────────────────────────────────
export const getMyDesigns = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data: designs, count, error } = await supabase
      .from("designs")
      .select("*", { count: "exact" })
      .eq("owner_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return res.json({
      designs,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error("getMyDesigns error:", error);
    return res.status(500).json({ message: "Error obteniendo tus diseños." });
  }
};

// ── GET /api/designs/:id ──────────────────────────────────────────────────────
export const getDesignById = async (req, res) => {
  try {
    const { data: design, error } = await supabase
      .from("designs")
      .select(`
        *,
        owner:owner_id ( id, first_name, last_name, avatar_url )
      `)
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });

    const isOwner = req.user?.id === design.owner_id;
    if (!design.is_public && !isOwner) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    // Incrementa views (fire-and-forget)
    supabase.from("designs").update({ views: design.views + 1 }).eq("id", design.id);

    return res.json({ design });
  } catch (error) {
    console.error("getDesignById error:", error);
    return res.status(500).json({ message: "Error obteniendo diseño." });
  }
};

// ── PUT /api/designs/:id ──────────────────────────────────────────────────────
export const updateDesign = async (req, res) => {
  try {
    const { data: design } = await supabase
      .from("designs").select("owner_id").eq("id", req.params.id).maybeSingle();

    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });
    if (design.owner_id !== req.user.id) {
      return res.status(403).json({ message: "No podés editar este diseño." });
    }

    const updates = {};
    if (req.body.title       !== undefined) updates.title       = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.category    !== undefined) updates.category    = req.body.category;
    if (req.body.isPublic    !== undefined) updates.is_public   = req.body.isPublic;
    if (req.body.tags        !== undefined) {
      updates.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : req.body.tags.split(",").map((t) => t.trim().toLowerCase());
    }

    const { data: updated, error } = await supabase
      .from("designs").update(updates).eq("id", req.params.id).select().single();

    if (error) throw error;
    return res.json({ message: "Diseño actualizado.", design: updated });
  } catch (error) {
    console.error("updateDesign error:", error);
    return res.status(500).json({ message: "Error actualizando diseño." });
  }
};

// ── DELETE /api/designs/:id ───────────────────────────────────────────────────
export const deleteDesign = async (req, res) => {
  try {
    const { data: design } = await supabase
      .from("designs")
      .select("owner_id, image_public_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });

    const isOwner = design.owner_id === req.user.id;
    const isAdmin = req.user.role   === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No podés eliminar este diseño." });
    }

    if (design.image_public_id) {
      await cloudinary.uploader.destroy(design.image_public_id);
    }

    const { error } = await supabase.from("designs").delete().eq("id", req.params.id);
    if (error) throw error;

    return res.json({ message: "Diseño eliminado." });
  } catch (error) {
    console.error("deleteDesign error:", error);
    return res.status(500).json({ message: "Error eliminando diseño." });
  }
};

// ── POST /api/designs/:id/like ────────────────────────────────────────────────
export const likeDesign = async (req, res) => {
  try {
    // Llama a una función RPC de Supabase para incrementar atómicamente
    const { data, error } = await supabase.rpc("increment_likes", { design_id: req.params.id });

    if (error) {
      // Fallback si la función RPC no existe aún: update manual
      const { data: d } = await supabase
        .from("designs").select("likes").eq("id", req.params.id).single();
      await supabase
        .from("designs").update({ likes: (d?.likes ?? 0) + 1 }).eq("id", req.params.id);
      return res.json({ likes: (d?.likes ?? 0) + 1 });
    }

    return res.json({ likes: data });
  } catch (error) {
    return res.status(500).json({ message: "Error." });
  }
};
