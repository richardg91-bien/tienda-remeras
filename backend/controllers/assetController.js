import { createHash } from "crypto";
import { cloudinary, uploadDesign, uploadToCloudinary } from "../config/cloudinary.js";
import { getDatabaseProvider, getLabDatabasePool } from "../config/databaseProvider.js";

const getSupabase = async () => (await import("../config/supabase.js")).default;
const labDatabase = () => getDatabaseProvider() === "postgres-lab";

const parseList = (value, { lowerCase = false } = {}) => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(",");
  return list.map((item) => String(item).trim()).filter(Boolean)
    .map((item) => lowerCase ? item.toLowerCase() : item);
};

const parseObject = (value, fallback = {}) => {
  if (!value) return fallback;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Los metadatos deben ser un objeto JSON.");
  }
  return parsed;
};

const pagination = (query, defaultLimit, maxLimit) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(maxLimit, requestedLimit) : defaultLimit;
  return { page, limit, offset: (page - 1) * limit };
};

const inReadTransaction = async (callback) => {
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

// ── Genera hash MD5 de un buffer ──────────────────────────
const hashBuffer = (buffer) =>
  createHash("md5").update(buffer).digest("hex");

// ── POST /api/assets ──────────────────────────────────────────────────────────
export const uploadAsset = [
  (req, res, next) => uploadDesign.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Se requiere una imagen." });

      const { name, category = "general", subcategory = "", license = "unknown", tags, formats, metadata, isSystem = false, isPublic = true } = req.body;

      // ── Calcula hash del archivo ──────────────────────
      const imageHash = hashBuffer(req.file.buffer);

      const tagsArr = parseList(tags, { lowerCase: true });
      const formatsArr = parseList(formats, { lowerCase: true });
      const metadataObject = parseObject(metadata);

      let asset;
      if (labDatabase()) {
        const pool = getLabDatabasePool();
        const { rows: hashMatches } = await pool.query(
          "SELECT id, name, url FROM public.design_assets WHERE image_hash = $1 LIMIT 1",
          [imageHash],
        );
        if (hashMatches[0]) {
          return res.status(409).json({ message: "Esta imagen ya existe en el banco.", existing: hashMatches[0] });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
          folder: "neon-stitch/assets",
          transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        });
        const { rows: publicIdMatches } = await pool.query(
          "SELECT id FROM public.design_assets WHERE public_id = $1 LIMIT 1",
          [result.publicId],
        );
        if (publicIdMatches[0]) {
          await cloudinary.uploader.destroy(result.publicId);
          return res.status(409).json({ message: "Imagen duplicada detectada." });
        }

        const { rows } = await pool.query(`
          INSERT INTO public.design_assets
            (name, url, public_id, image_hash, category, subcategory, license, formats,
             metadata, tags, is_system, is_public, uploaded_by, width, height, format, bytes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9::jsonb, $10::text[],
                  $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `, [name || req.file.originalname || "Sin nombre", result.url, result.publicId, imageHash,
          category, subcategory, license, formatsArr.length ? formatsArr : [result.format],
          JSON.stringify(metadataObject), tagsArr, isSystem === "true" || isSystem === true,
          isPublic === "true" || isPublic === true, req.user?.id || null,
          result.width, result.height, result.format, result.bytes]);
        asset = rows[0];
      } else {
        const supabase = await getSupabase();
        const { data: byHash } = await supabase.from("design_assets").select("id, name, url")
          .eq("image_hash", imageHash).maybeSingle();
        if (byHash) {
          return res.status(409).json({ message: "Esta imagen ya existe en el banco.", existing: byHash });
        }
        const result = await uploadToCloudinary(req.file.buffer, {
          folder: "neon-stitch/assets",
          transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        });
        const { data: byPublicId } = await supabase.from("design_assets").select("id")
          .eq("public_id", result.publicId).maybeSingle();
        if (byPublicId) {
          await cloudinary.uploader.destroy(result.publicId);
          return res.status(409).json({ message: "Imagen duplicada detectada." });
        }
        const { data, error } = await supabase.from("design_assets").insert({
          name: name || req.file.originalname || "Sin nombre", url: result.url,
          public_id: result.publicId, image_hash: imageHash, category, subcategory, license,
          formats: formatsArr.length ? formatsArr : [result.format], metadata: metadataObject,
          tags: tagsArr, is_system: isSystem === "true" || isSystem === true,
          is_public: isPublic === "true" || isPublic === true, uploaded_by: req.user?.id || null,
          width: result.width, height: result.height, format: result.format, bytes: result.bytes,
        }).select().single();
        if (error) throw error;
        asset = data;
      }

      return res.status(201).json({ message: "Imagen subida al banco.", asset });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ message: "Imagen duplicada — ya existe en el banco." });
      }
      console.error("uploadAsset error:", { code: error?.code || "unknown" });
      return res.status(500).json({ message: "Error subiendo imagen." });
    }
  },
];

// ── GET /api/assets ───────────────────────────────────────────────────────────
export const getAssets = async (req, res) => {
  try {
    const { page, limit, offset } = pagination(req.query, 24, 100);
    if (!Number.isSafeInteger(offset)) return res.status(400).json({ message: "Paginación inválida." });

    if (labDatabase()) {
      const filters = ["is_public = TRUE"];
      const values = [];
      const addFilter = (sql, value) => {
        values.push(value);
        filters.push(sql.replace("?", `$${values.length}`));
      };
      if (req.query.category) addFilter("category = ?", req.query.category);
      if (req.query.subcategory) addFilter("subcategory = ?", req.query.subcategory);
      if (req.query.license) addFilter("license = ?", req.query.license);
      if (req.query.tags) addFilter("tags && ?::text[]", parseList(req.query.tags));
      if (req.query.search) addFilter("name ILIKE ?", `%${String(req.query.search).slice(0, 200)}%`);
      const where = filters.join(" AND ");
      const result = await inReadTransaction(async (client) => {
        const [{ rows: countRows }, { rows: assets }] = await Promise.all([
          client.query(`SELECT COUNT(*)::int AS total FROM public.design_assets WHERE ${where}`, values),
          client.query(`SELECT * FROM public.design_assets WHERE ${where}
            ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, limit, offset]),
        ]);
        return { assets, total: countRows[0].total };
      });
      return res.json({ assets: result.assets, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
    }

    const supabase = await getSupabase();
    const from = offset;
    const to = from + limit - 1;
    let query = supabase.from("design_assets").select("*", { count: "exact" })
      .eq("is_public", true).order("created_at", { ascending: false }).range(from, to);
    if (req.query.category) query = query.eq("category", req.query.category);
    if (req.query.subcategory) query = query.eq("subcategory", req.query.subcategory);
    if (req.query.license) query = query.eq("license", req.query.license);
    if (req.query.tags) query = query.overlaps("tags", parseList(req.query.tags));
    if (req.query.search) query = query.ilike("name", `%${String(req.query.search).slice(0, 200)}%`);
    const { data: assets, count, error } = await query;
    if (error) throw error;
    return res.json({ assets, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) {
    console.error("getAssets error:", { code: error?.code || "unknown" });
    return res.status(500).json({ message: "Error obteniendo imágenes." });
  }
};

// ── GET /api/assets/:id ───────────────────────────────────────────────────────
export const getAssetById = async (req, res) => {
  try {
    if (labDatabase()) {
      const { rows } = await getLabDatabasePool().query(`
        SELECT * FROM public.design_assets
        WHERE id = $1 AND (is_public = TRUE OR uploaded_by = $2 OR $3::boolean = TRUE)
      `, [req.params.id, req.user?.id || null, req.user?.role === "admin"]);
      if (!rows[0]) return res.status(404).json({ message: "Imagen no encontrada." });
      return res.json({ asset: rows[0] });
    }
    const supabase = await getSupabase();
    const { data: asset, error } = await supabase.from("design_assets").select("*")
      .eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!asset) return res.status(404).json({ message: "Imagen no encontrada." });
    if (!asset.is_public && asset.uploaded_by !== req.user?.id && req.user?.role !== "admin") {
      return res.status(404).json({ message: "Imagen no encontrada." });
    }
    return res.json({ asset });
  } catch {
    return res.status(500).json({ message: "Error obteniendo imagen." });
  }
};

// ── DELETE /api/assets/:id ────────────────────────────────────────────────────
export const deleteAsset = async (req, res) => {
  try {
    let asset;
    if (labDatabase()) {
      const { rows } = await getLabDatabasePool().query(
        "SELECT public_id, uploaded_by, is_system FROM public.design_assets WHERE id = $1",
        [req.params.id],
      );
      asset = rows[0];
    } else {
      const supabase = await getSupabase();
      const { data } = await supabase.from("design_assets").select("public_id, uploaded_by, is_system")
        .eq("id", req.params.id).maybeSingle();
      asset = data;
    }
    if (!asset) return res.status(404).json({ message: "Imagen no encontrada." });
    const isOwner = asset.uploaded_by === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "No podés eliminar esta imagen." });

    if (asset.public_id) await cloudinary.uploader.destroy(asset.public_id);
    if (labDatabase()) {
      await getLabDatabasePool().query(
        "DELETE FROM public.design_assets WHERE id = $1 AND (uploaded_by = $2 OR $3::boolean = TRUE)",
        [req.params.id, req.user.id, isAdmin],
      );
    } else {
      const supabase = await getSupabase();
      const { error } = await supabase.from("design_assets").delete().eq("id", req.params.id);
      if (error) throw error;
    }
    return res.json({ message: "Imagen eliminada del banco." });
  } catch (error) {
    console.error("deleteAsset error:", { code: error?.code || "unknown" });
    return res.status(500).json({ message: "Error eliminando imagen." });
  }
};

// ── GET /api/assets/categories ────────────────────────────────────────────────
export const getCategories = async (_req, res) => {
  try {
    let grouped;
    if (labDatabase()) {
      const { rows } = await getLabDatabasePool().query(`
        SELECT category, subcategory, COUNT(*)::int AS count
        FROM public.design_assets WHERE is_public = TRUE
        GROUP BY category, subcategory
      `);
      grouped = rows;
    } else {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("design_assets").select("category, subcategory").eq("is_public", true);
      if (error) throw error;
      const groups = new Map();
      for (const { category, subcategory } of data) {
        const key = `${category}\0${subcategory || ""}`;
        groups.set(key, { category, subcategory, count: (groups.get(key)?.count || 0) + 1 });
      }
      grouped = [...groups.values()];
    }

    const counts = grouped.reduce((acc, { category, subcategory, count }) => {
      acc[category] ||= { count: 0, subcategories: {} };
      acc[category].count += Number(count);
      if (subcategory) acc[category].subcategories[subcategory] = (acc[category].subcategories[subcategory] || 0) + Number(count);
      return acc;
    }, {});
    const knownCategories = [
      { value: "todos", label: "Todos" }, { value: "cyberpunk", label: "Cyberpunk" },
      { value: "streetwear", label: "Streetwear" }, { value: "graficos", label: "Gráficos" },
      { value: "logos", label: "Logos" }, { value: "minimalista", label: "Minimalista" },
      { value: "texturas", label: "Texturas" }, { value: "iconos", label: "Íconos" },
      { value: "general", label: "General" },
    ];
    const known = new Set(knownCategories.map(({ value }) => value));
    const categories = [
      ...knownCategories,
      ...Object.keys(counts).filter((value) => !known.has(value)).map((value) => ({
        value, label: value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      })),
    ].map((category) => ({
      ...category,
      count: counts[category.value]?.count || 0,
      subcategories: Object.entries(counts[category.value]?.subcategories || {}).map(([value, count]) => ({ value, count })),
    }));
    return res.json({ categories });
  } catch (error) {
    console.error("getCategories error:", { code: error?.code || "unknown" });
    return res.status(500).json({ message: "Error obteniendo categorías." });
  }
};
