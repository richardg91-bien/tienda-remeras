import { randomUUID } from "crypto";
import { products as catalogProducts } from "../../src/data/products.js";
import { getDatabaseProvider, getLabDatabasePool } from "../config/databaseProvider.js";
import { withUserTransaction } from "../config/postgresPool.js";

const getSupabase = async () => (await import("../config/supabase.js")).default;

const projectFields = "id, name, product_ref, product_category, variant, canvas, preview_url, production, created_at, updated_at";
const fail = (res, error, message) => {
  console.error(message, { code: error?.code || "unknown" });
  return res.status(error?.code === "PGRST116" ? 404 : 500).json({ message });
};

const projectColumns = "id, name, product_ref, product_category, variant, canvas, preview_url, production, created_at, updated_at";
const inProjectScope = (userId, callback) => withUserTransaction(getLabDatabasePool(), userId, async (client) => {
  // The local Supabase-compatible role has only the project grants from the lab migration.
  await client.query("SET LOCAL ROLE authenticated");
  return callback(client);
});

const loadProductModel = async (productRef) => {
  if (getDatabaseProvider() === "postgres-lab") {
    const { rows } = await getLabDatabasePool().query(`
      SELECT id, category, variant_schema, print_surfaces, production_template
      FROM public.product_models WHERE id = $1 AND active = TRUE
    `, [productRef]);
    return rows[0] || null;
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("product_models")
    .select("id, category, variant_schema, print_surfaces, production_template")
    .eq("id", productRef).eq("active", true).maybeSingle();
  if (error) throw error;
  return data;
};

const canvasSurfaceIds = (canvas, productRef) => {
  const surfaces = canvas?.products?.[productRef]?.surfaces || canvas?.surfaces || {};
  return Object.keys(surfaces);
};

const prepareProduction = (production, model, variant) => {
  const dpi = Number(model.production_template?.resolutionDpi) || 300;
  const surfaces = {};
  for (const surface of model.print_surfaces || []) {
    const dimensions = surface.widthMm && surface.heightMm
      ? { widthMm: surface.widthMm, heightMm: surface.heightMm }
      : surface.diameterMm
        ? { widthMm: surface.diameterMm, heightMm: surface.diameterMm }
        : null;
    if (!dimensions) continue;
    surfaces[surface.id] = {
      ...dimensions,
      dpi,
      widthPx: Math.round(dimensions.widthMm / 25.4 * dpi),
      heightPx: Math.round(dimensions.heightMm / 25.4 * dpi),
    };
  }
  const products = production?.products && typeof production.products === "object"
    ? { ...production.products }
    : {};
  products[model.id] = {
    ...(products[model.id] || {}),
    template: model.production_template || {},
    surfaces,
  };
  return {
    ...(production && typeof production === "object" ? production : {}),
    productRef: model.id,
    productCategory: model.category,
    variant,
    products,
  };
};

export const listProjects = async (req, res) => {
  if (getDatabaseProvider() === "postgres-lab") {
    try {
      const projects = await inProjectScope(req.user.id, async (client) => {
        const { rows } = await client.query(
          `SELECT ${projectColumns} FROM public.design_projects WHERE owner_id = $1 ORDER BY updated_at DESC`,
          [req.user.id],
        );
        return rows;
      });
      return res.json({ projects });
    } catch (error) {
      return fail(res, error, "Error obteniendo proyectos.");
    }
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("design_projects").select(projectFields)
    .eq("owner_id", req.user.id).order("updated_at", { ascending: false });
  if (error) return fail(res, error, "Error obteniendo proyectos.");
  return res.json({ projects: data });
};

export const getProject = async (req, res) => {
  if (getDatabaseProvider() === "postgres-lab") {
    try {
      const project = await inProjectScope(req.user.id, async (client) => {
        const { rows } = await client.query(
          `SELECT ${projectColumns} FROM public.design_projects WHERE owner_id = $1 AND id = $2`,
          [req.user.id, req.params.id],
        );
        return rows[0] || null;
      });
      if (!project) return res.status(404).json({ message: "Proyecto no encontrado." });
      return res.json({ project });
    } catch (error) {
      return fail(res, error, "Error obteniendo proyecto.");
    }
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("design_projects").select(projectFields)
    .eq("owner_id", req.user.id).eq("id", req.params.id).maybeSingle();
  if (error) return fail(res, error, "Error obteniendo proyecto.");
  if (!data) return res.status(404).json({ message: "Proyecto no encontrado." });
  return res.json({ project: data });
};

export const saveProject = async (req, res) => {
  const body = req.body || {};
  const projectId = req.method === "PUT" ? req.params.id : null;
  const input = {
    owner_id: req.user.id,
    name: String(body.name || "Proyecto sin título").slice(0, 120),
    product_ref: String(body.productRef || "tee-classic"),
    product_category: body.productCategory === "sublimacion" ? "sublimacion" : "textil",
    variant: body.variant && typeof body.variant === "object" && !Array.isArray(body.variant) ? body.variant : {},
    canvas: body.canvas && typeof body.canvas === "object" && !Array.isArray(body.canvas) ? body.canvas : {},
    preview_url: typeof body.previewUrl === "string" ? body.previewUrl : "",
    production: body.production && typeof body.production === "object" && !Array.isArray(body.production) ? body.production : {},
  };
  let model;
  try {
    model = await loadProductModel(input.product_ref);
  } catch (error) {
    return fail(res, error, "Error validando el modelo de producto.");
  }
  if (!model) return res.status(400).json({ message: "El producto seleccionado no existe o no está activo." });
  if (model.category !== input.product_category) {
    return res.status(400).json({ message: "La categoría no coincide con el producto seleccionado." });
  }
  const configuredSurfaceIds = new Set((model.print_surfaces || []).map(({ id }) => id));
  const selectedSurfaceIds = canvasSurfaceIds(input.canvas, model.id);
  if (selectedSurfaceIds.some((surfaceId) => !configuredSurfaceIds.has(surfaceId))) {
    return res.status(400).json({ message: "El diseño incluye una superficie que no pertenece al producto." });
  }
  const selectedSize = input.variant.size;
  if (selectedSize && Array.isArray(model.variant_schema?.sizes)
      && !model.variant_schema.sizes.some((size) => String(typeof size === "object" ? size.id || size.value || size.label : size) === String(selectedSize))) {
    return res.status(400).json({ message: "El talle no está disponible para el producto seleccionado." });
  }
  if (input.variant.catalogProductId !== undefined && input.variant.catalogProductId !== null) {
    const catalogProduct = catalogProducts.find((product) => String(product.id) === String(input.variant.catalogProductId));
    if (!catalogProduct || (catalogProduct.productRef && catalogProduct.productRef !== model.id)) {
      return res.status(400).json({ message: "El producto de catálogo no corresponde al modelo seleccionado." });
    }
    if (selectedSize && Array.isArray(catalogProduct.sizes) && !catalogProduct.sizes.includes(selectedSize)) {
      return res.status(400).json({ message: "El talle no está disponible para el producto de catálogo." });
    }
  }
  input.production = prepareProduction(input.production, model, input.variant);
  if (getDatabaseProvider() === "postgres-lab") {
    try {
      const project = await inProjectScope(req.user.id, async (client) => {
        if (projectId) {
          const { rows } = await client.query(`
            UPDATE public.design_projects
            SET name = $1, product_ref = $2, product_category = $3,
                variant = $4::jsonb, canvas = $5::jsonb, preview_url = $6,
                production = $7::jsonb
            WHERE id = $8 AND owner_id = $9
            RETURNING ${projectColumns}
          `, [input.name, input.product_ref, input.product_category,
            JSON.stringify(input.variant), JSON.stringify(input.canvas), input.preview_url,
            JSON.stringify(input.production), projectId, req.user.id]);
          return rows[0] || null;
        }
        const { rows } = await client.query(`
          INSERT INTO public.design_projects
            (owner_id, name, product_ref, product_category, variant, canvas, preview_url, production)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb)
          RETURNING ${projectColumns}
        `, [req.user.id, input.name, input.product_ref, input.product_category,
          JSON.stringify(input.variant), JSON.stringify(input.canvas), input.preview_url,
          JSON.stringify(input.production)]);
        return rows[0];
      });
      if (!project) return res.status(404).json({ message: "Proyecto no encontrado." });
      return res.status(projectId ? 200 : 201).json({ project });
    } catch (error) {
      return fail(res, error, "Error guardando proyecto.");
    }
  }
  const supabase = await getSupabase();
  const query = projectId
    ? supabase.from("design_projects").update(input).eq("id", projectId).eq("owner_id", req.user.id)
    : supabase.from("design_projects").insert(input);
  const { data, error } = await query.select(projectFields).maybeSingle();
  if (error) return fail(res, error, "Error guardando proyecto.");
  if (!data) return res.status(404).json({ message: "Proyecto no encontrado." });
  return res.status(projectId ? 200 : 201).json({ project: data });
};

export const deleteProject = async (req, res) => {
  if (getDatabaseProvider() === "postgres-lab") {
    try {
      const deleted = await inProjectScope(req.user.id, async (client) => {
        const { rows } = await client.query(
          "DELETE FROM public.design_projects WHERE owner_id = $1 AND id = $2 RETURNING id",
          [req.user.id, req.params.id],
        );
        return rows[0] || null;
      });
      if (!deleted) return res.status(404).json({ message: "Proyecto no encontrado." });
      return res.json({ deleted: true });
    } catch (error) {
      return fail(res, error, "Error eliminando proyecto.");
    }
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("design_projects").delete()
    .eq("owner_id", req.user.id).eq("id", req.params.id).select("id").maybeSingle();
  if (error) return fail(res, error, "Error eliminando proyecto.");
  if (!data) return res.status(404).json({ message: "Proyecto no encontrado." });
  return res.json({ deleted: true });
};

export const isPrivateAssetPathOwnedBy = (path, userId) => {
  if (typeof path !== "string" || typeof userId !== "string") return false;
  const [ownerId, fileName, ...extraSegments] = path.split("/");
  return ownerId === userId && Boolean(fileName) && extraSegments.length === 0
    && fileName !== "." && fileName !== ".." && !fileName.includes("\\");
};

export const createPrivateAssetHandlers = ({ getSupabase: getStorageClient = getSupabase } = {}) => ({
  uploadPrivateAsset: async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Se requiere una imagen." });
    const supabase = await getStorageClient();
    const safeName = req.file.originalname.replace(/[^\w.-]/g, "_");
    const key = `${req.user.id}/${randomUUID()}_${safeName}`;
    const { error } = await supabase.storage.from("customer-designs").upload(key, req.file.buffer, {
      contentType: req.file.mimetype, upsert: false,
    });
    if (error) return fail(res, error, "Error guardando archivo privado.");
    const { data: signed, error: signError } = await supabase.storage.from("customer-designs").createSignedUrl(key, 300);
    if (signError) {
      await supabase.storage.from("customer-designs").remove([key]).catch(() => {});
      return fail(res, signError, "Archivo guardado, pero no se pudo generar acceso temporal.");
    }
    return res.status(201).json({ asset: { path: key, name: req.file.originalname, mimeType: req.file.mimetype, bytes: req.file.size, url: signed.signedUrl, expiresIn: 300 } });
  },

  listPrivateAssets: async (req, res) => {
    try {
      const supabase = await getStorageClient();
      const { data: files, error } = await supabase.storage.from("customer-designs").list(req.user.id, {
        limit: 100, sortBy: { column: "created_at", order: "desc" },
      });
      if (error) return fail(res, error, "Error obteniendo archivos privados.");
      const assets = await Promise.all((files || []).filter((file) => file.id).map(async (file) => {
        const path = `${req.user.id}/${file.name}`;
        const { data, error: signError } = await supabase.storage.from("customer-designs").createSignedUrl(path, 300);
        if (signError) throw signError;
        return { path, name: file.name, metadata: file.metadata || {}, url: data.signedUrl, expiresIn: 300 };
      }));
      return res.json({ assets });
    } catch (error) {
      return fail(res, error, "Error generando acceso a los archivos privados.");
    }
  },

  getPrivateAssetUrl: async (req, res) => {
    const path = String(req.query.path || "");
    if (!isPrivateAssetPathOwnedBy(path, req.user.id)) return res.status(403).json({ message: "Acceso denegado." });
    const supabase = await getStorageClient();
    const { data, error } = await supabase.storage.from("customer-designs").createSignedUrl(path, 300);
    if (error) return res.status(404).json({ message: "Archivo no encontrado." });
    return res.json({ url: data.signedUrl, expiresIn: 300 });
  },
});

const privateAssetHandlers = createPrivateAssetHandlers();
export const uploadPrivateAsset = privateAssetHandlers.uploadPrivateAsset;
export const listPrivateAssets = privateAssetHandlers.listPrivateAssets;
export const getPrivateAssetUrl = privateAssetHandlers.getPrivateAssetUrl;
