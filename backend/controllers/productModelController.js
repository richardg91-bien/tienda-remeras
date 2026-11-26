import { getDatabaseProvider, getLabDatabasePool } from "../config/databaseProvider.js";

const modelFields = "id, category, name, variant_schema, print_surfaces, production_template";
const getSupabase = async () => (await import("../config/supabase.js")).default;

const modelFailure = (res, error) => {
  console.error("Product model database error:", { code: error?.code || "unknown" });
  return res.status(500).json({ message: "Error obteniendo modelos de producto." });
};

export const getProductModels = async (_req, res) => {
  if (getDatabaseProvider() === "postgres-lab") {
    try {
      const { rows: models } = await getLabDatabasePool().query(
        `SELECT ${modelFields} FROM public.product_models WHERE active = TRUE ORDER BY category, name`,
      );
      return res.json({ models });
    } catch (error) {
      return modelFailure(res, error);
    }
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("product_models")
    .select(modelFields)
    .eq("active", true).order("category").order("name");
  if (error) {
    console.error("getProductModels error:", error);
    return res.status(500).json({ message: "Error obteniendo modelos de producto." });
  }
  return res.json({ models: data });
};

export const getProductModel = async (req, res) => {
  if (getDatabaseProvider() === "postgres-lab") {
    try {
      const { rows } = await getLabDatabasePool().query(
        `SELECT ${modelFields} FROM public.product_models WHERE active = TRUE AND id = $1`,
        [req.params.id],
      );
      if (!rows[0]) return res.status(404).json({ message: "Modelo de producto no encontrado." });
      return res.json({ model: rows[0] });
    } catch (error) {
      return modelFailure(res, error);
    }
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("product_models")
    .select(modelFields).eq("active", true).eq("id", req.params.id).maybeSingle();
  if (error) return modelFailure(res, error);
  if (!data) return res.status(404).json({ message: "Modelo de producto no encontrado." });
  return res.json({ model: data });
};
