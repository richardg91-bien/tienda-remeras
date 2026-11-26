import { cloudinary, uploadDesign, uploadToCloudinary } from "../config/cloudinary.js";
import { getDatabaseProvider, getLabDatabasePool } from "../config/databaseProvider.js";

const getSupabase = async () => (await import("../config/supabase.js")).default;
const labDatabase = () => getDatabaseProvider() === "postgres-lab";
const designOwner = (user) => user?.id || null;
const pagination = (query) => {
  const pageValue = Number.parseInt(query.page, 10);
  const limitValue = Number.parseInt(query.limit, 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit = Number.isSafeInteger(limitValue) && limitValue > 0 ? Math.min(50, limitValue) : 12;
  return { page, limit, offset: (page - 1) * limit };
};
const parseTags = (tags) => {
  if (!tags) return [];
  const values = Array.isArray(tags) ? tags : String(tags).split(",");
  return values.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
};
const logDatabaseError = (label, error) => console.error(label, { code: error?.code || "unknown" });

const withReadTransaction = async (callback) => {
  const client = await getLabDatabasePool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const ownerProjection = `jsonb_build_object(
  'id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'avatar_url', u.avatar_url
) AS owner`;

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
      const imageResult = await uploadToCloudinary(req.file.buffer, {
        folder: "neon-stitch/designs",
        transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
      });
      const tagsArr = parseTags(tags);
      const fields = {
        owner_id: req.user.id,
        image_url: imageResult.url,
        image_public_id: imageResult.publicId,
        image_meta: { width: imageResult.width, height: imageResult.height, format: imageResult.format, bytes: imageResult.bytes },
        title: title || "Sin título",
        description: description || "",
        tags: tagsArr,
        category: category || "otro",
        is_public: isPublic === "true" || isPublic === true,
      };
      let design;
      if (labDatabase()) {
        const { rows } = await getLabDatabasePool().query(`
          INSERT INTO public.designs
            (owner_id, image_url, image_public_id, image_meta, title, description, tags, category, is_public)
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::text[], $8, $9)
          RETURNING *
        `, [fields.owner_id, fields.image_url, fields.image_public_id, JSON.stringify(fields.image_meta),
          fields.title, fields.description, fields.tags, fields.category, fields.is_public]);
        design = rows[0];
      } else {
        const supabase = await getSupabase();
        const { data, error } = await supabase.from("designs").insert(fields).select().single();
        if (error) throw error;
        design = data;
      }
      return res.status(201).json({ message: "Diseño subido exitosamente.", design });
    } catch (error) {
      logDatabaseError("createDesign error:", error);
      return res.status(500).json({ message: "Error subiendo diseño." });
    }
  },
];

// ── GET /api/designs — Galería pública ────────────────────────────────────────
export const getPublicDesigns = async (req, res) => {
  try {
    const { page, limit, offset } = pagination(req.query);
    if (!Number.isSafeInteger(offset)) return res.status(400).json({ message: "Paginación inválida." });
    if (labDatabase()) {
      const filters = ["d.is_public = TRUE", "d.status = 'approved'"];
      const values = [];
      const add = (sql, value) => { values.push(value); filters.push(sql.replace("?", `$${values.length}`)); };
      if (req.query.category) add("d.category = ?", String(req.query.category));
      const tags = parseTags(req.query.tags);
      if (tags.length) add("d.tags && ?::text[]", tags);
      const where = filters.join(" AND ");
      const result = await withReadTransaction(async (client) => {
        const [{ rows: countRows }, { rows: designs }] = await Promise.all([
          client.query(`SELECT COUNT(*)::int AS total FROM public.designs d WHERE ${where}`, values),
          client.query(`
            SELECT d.id, d.title, d.description, d.tags, d.category, d.image_url, d.image_meta,
              d.likes, d.views, d.created_at, ${ownerProjection}
            FROM public.designs d JOIN public.users u ON u.id = d.owner_id
            WHERE ${where} ORDER BY d.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}
          `, [...values, limit, offset]),
        ]);
        return { designs, total: countRows[0].total };
      });
      return res.json({ designs: result.designs, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
    }

    const supabase = await getSupabase();
    const from = offset;
    const to = from + limit - 1;
    let query = supabase.from("designs").select(`
      id, title, description, tags, category, image_url, image_meta, likes, views, created_at,
      owner:owner_id ( id, first_name, last_name, avatar_url )
    `, { count: "exact" }).eq("is_public", true).eq("status", "approved")
      .order("created_at", { ascending: false }).range(from, to);
    if (req.query.category) query = query.eq("category", req.query.category);
    const tags = parseTags(req.query.tags);
    if (tags.length) query = query.overlaps("tags", tags);
    const { data: designs, count, error } = await query;
    if (error) throw error;
    return res.json({ designs, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) {
    logDatabaseError("getPublicDesigns error:", error);
    return res.status(500).json({ message: "Error obteniendo diseños." });
  }
};

// ── GET /api/designs/mine ─────────────────────────────────────────────────────
export const getMyDesigns = async (req, res) => {
  try {
    const { page, limit, offset } = pagination(req.query);
    if (!Number.isSafeInteger(offset)) return res.status(400).json({ message: "Paginación inválida." });
    if (labDatabase()) {
      const result = await withReadTransaction(async (client) => {
        const [{ rows: countRows }, { rows: designs }] = await Promise.all([
          client.query("SELECT COUNT(*)::int AS total FROM public.designs WHERE owner_id = $1", [req.user.id]),
          client.query("SELECT * FROM public.designs WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [req.user.id, limit, offset]),
        ]);
        return { designs, total: countRows[0].total };
      });
      return res.json({ designs: result.designs, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
    }
    const supabase = await getSupabase();
    const { data: designs, count, error } = await supabase.from("designs").select("*", { count: "exact" })
      .eq("owner_id", req.user.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return res.json({ designs, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) {
    logDatabaseError("getMyDesigns error:", error);
    return res.status(500).json({ message: "Error obteniendo tus diseños." });
  }
};

// ── GET /api/designs/:id ──────────────────────────────────────────────────────
export const getDesignById = async (req, res) => {
  try {
    let design;
    if (labDatabase()) {
      design = await getLabDatabasePool().connect().then(async (client) => {
        try {
          await client.query("BEGIN");
          const { rows } = await client.query(`
            SELECT d.*, ${ownerProjection} FROM public.designs d
            JOIN public.users u ON u.id = d.owner_id WHERE d.id = $1
          `, [req.params.id]);
          const row = rows[0] || null;
          if (row && (row.is_public || row.owner_id === designOwner(req.user))) {
            await client.query("UPDATE public.designs SET views = views + 1 WHERE id = $1", [row.id]);
          }
          await client.query("COMMIT");
          return row;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      });
    } else {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("designs").select(`*, owner:owner_id ( id, first_name, last_name, avatar_url )`)
        .eq("id", req.params.id).maybeSingle();
      if (error) throw error;
      design = data;
      if (design && (design.is_public || design.owner_id === designOwner(req.user))) {
        void supabase.from("designs").update({ views: design.views + 1 }).eq("id", design.id);
      }
    }
    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });
    if (!design.is_public && design.owner_id !== designOwner(req.user)) return res.status(403).json({ message: "Acceso denegado." });
    return res.json({ design });
  } catch (error) {
    logDatabaseError("getDesignById error:", error);
    return res.status(500).json({ message: "Error obteniendo diseño." });
  }
};

// ── PUT /api/designs/:id ──────────────────────────────────────────────────────
export const updateDesign = async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const add = (column, value) => { values.push(value); fields.push(`${column} = $${values.length}`); };
    if (req.body.title !== undefined) add("title", req.body.title);
    if (req.body.description !== undefined) add("description", req.body.description);
    if (req.body.category !== undefined) add("category", req.body.category);
    if (req.body.isPublic !== undefined) add("is_public", req.body.isPublic);
    if (req.body.tags !== undefined) add("tags", parseTags(req.body.tags));
    if (!fields.length) {
      if (labDatabase()) {
        const { rows } = await getLabDatabasePool().query("SELECT * FROM public.designs WHERE id = $1 AND owner_id = $2", [req.params.id, req.user.id]);
        if (!rows[0]) {
          const { rows: exists } = await getLabDatabasePool().query("SELECT id FROM public.designs WHERE id = $1", [req.params.id]);
          return exists[0] ? res.status(403).json({ message: "No podés editar este diseño." }) : res.status(404).json({ message: "Diseño no encontrado." });
        }
        return res.json({ message: "Diseño actualizado.", design: rows[0] });
      }
      const supabase = await getSupabase();
      const { data: existing } = await supabase.from("designs").select("owner_id").eq("id", req.params.id).maybeSingle();
      if (!existing) return res.status(404).json({ message: "Diseño no encontrado." });
      if (existing.owner_id !== req.user.id) return res.status(403).json({ message: "No podés editar este diseño." });
      const { data: updated, error } = await supabase.from("designs").update({}).eq("id", req.params.id).select().single();
      if (error) throw error;
      return res.json({ message: "Diseño actualizado.", design: updated });
    }

    if (labDatabase()) {
      const pool = getLabDatabasePool();
      const { rows: existing } = await pool.query("SELECT owner_id FROM public.designs WHERE id = $1", [req.params.id]);
      if (!existing[0]) return res.status(404).json({ message: "Diseño no encontrado." });
      if (existing[0].owner_id !== req.user.id) return res.status(403).json({ message: "No podés editar este diseño." });
      values.push(req.params.id, req.user.id);
      const { rows } = await pool.query(`UPDATE public.designs SET ${fields.join(", ")}
        WHERE id = $${values.length - 1} AND owner_id = $${values.length} RETURNING *`, values);
      if (!rows[0]) return res.status(404).json({ message: "Diseño no encontrado." });
      return res.json({ message: "Diseño actualizado.", design: rows[0] });
    }

    const supabase = await getSupabase();
    const { data: existing } = await supabase.from("designs").select("owner_id").eq("id", req.params.id).maybeSingle();
    if (!existing) return res.status(404).json({ message: "Diseño no encontrado." });
    if (existing.owner_id !== req.user.id) return res.status(403).json({ message: "No podés editar este diseño." });
    const updateObject = {};
    if (req.body.title !== undefined) updateObject.title = req.body.title;
    if (req.body.description !== undefined) updateObject.description = req.body.description;
    if (req.body.category !== undefined) updateObject.category = req.body.category;
    if (req.body.isPublic !== undefined) updateObject.is_public = req.body.isPublic;
    if (req.body.tags !== undefined) updateObject.tags = parseTags(req.body.tags);
    const { data: updated, error } = await supabase.from("designs").update(updateObject).eq("id", req.params.id).select().single();
    if (error) throw error;
    return res.json({ message: "Diseño actualizado.", design: updated });
  } catch (error) {
    logDatabaseError("updateDesign error:", error);
    return res.status(500).json({ message: "Error actualizando diseño." });
  }
};

// ── DELETE /api/designs/:id ───────────────────────────────────────────────────
export const deleteDesign = async (req, res) => {
  try {
    let design;
    if (labDatabase()) {
      const { rows } = await getLabDatabasePool().query("SELECT owner_id, image_public_id FROM public.designs WHERE id = $1", [req.params.id]);
      design = rows[0];
    } else {
      const supabase = await getSupabase();
      const { data } = await supabase.from("designs").select("owner_id, image_public_id").eq("id", req.params.id).maybeSingle();
      design = data;
    }
    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });
    const isOwner = design.owner_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "No podés eliminar este diseño." });
    if (design.image_public_id) await cloudinary.uploader.destroy(design.image_public_id);
    if (labDatabase()) {
      await getLabDatabasePool().query("DELETE FROM public.designs WHERE id = $1 AND (owner_id = $2 OR $3::boolean = TRUE)",
        [req.params.id, req.user.id, isAdmin]);
    } else {
      const supabase = await getSupabase();
      const { error } = await supabase.from("designs").delete().eq("id", req.params.id);
      if (error) throw error;
    }
    return res.json({ message: "Diseño eliminado." });
  } catch (error) {
    logDatabaseError("deleteDesign error:", error);
    return res.status(500).json({ message: "Error eliminando diseño." });
  }
};

// ── POST /api/designs/:id/like ────────────────────────────────────────────────
export const likeDesign = async (req, res) => {
  try {
    if (labDatabase()) {
      const { rows } = await getLabDatabasePool().query(
        "UPDATE public.designs SET likes = likes + 1 WHERE id = $1 RETURNING likes", [req.params.id],
      );
      return res.json({ likes: rows[0]?.likes ?? 0 });
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("increment_likes", { design_id: req.params.id });
    if (error) {
      const { data: design } = await supabase.from("designs").select("likes").eq("id", req.params.id).single();
      await supabase.from("designs").update({ likes: (design?.likes ?? 0) + 1 }).eq("id", req.params.id);
      return res.json({ likes: (design?.likes ?? 0) + 1 });
    }
    return res.json({ likes: data });
  } catch (error) {
    logDatabaseError("likeDesign error:", error);
    return res.status(500).json({ message: "Error." });
  }
};
