import { randomUUID } from "node:crypto";
import { createLabPostgresPool } from "../config/labPostgresPool.js";
import { withUserTransaction } from "../config/postgresPool.js";

const pool = createLabPostgresPool();
let syntheticUserId;
const report = (name, details = "ok") => console.log(`${name}: ${details}`);
const counts = async () => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM public.users) AS users,
      (SELECT count(*)::int FROM public.design_assets) AS assets,
      (SELECT count(*)::int FROM public.designs) AS designs,
      (SELECT count(*)::int FROM public.orders) AS orders,
      (SELECT count(*)::int FROM public.design_projects) AS projects
  `);
  return rows[0];
};

try {
  const { rows: identity } = await pool.query(
    "SELECT current_database() AS database, current_user AS role, current_setting('server_version') AS version",
  );
  if (identity[0].database !== "tienda_remeras_app_lab") throw new Error("Unsafe database target.");
  report("connection", `PostgreSQL ${identity[0].version}; expected local database`);

  const initial = await counts();
  report("baseline counts", JSON.stringify(initial));

  const { rows: models } = await pool.query(
    "SELECT id, category, jsonb_array_length(print_surfaces) AS surfaces FROM public.product_models ORDER BY id",
  );
  if (models.length !== 6 || models.some((model) => model.surfaces < 1)) throw new Error("Model/surface catalog incomplete.");
  report("six product models", models.map(({ id, surfaces }) => `${id}:${surfaces}`).join(", "));

  const { rows: relationCheck } = await pool.query(`
    SELECT
      to_regclass('public.designs_public') IS NOT NULL AS public_designs_view,
      (SELECT count(*)::int FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace) AS foreign_keys,
      (SELECT count(*)::int FROM public.orders o LEFT JOIN public.users u ON u.id = o.user_id WHERE o.user_id IS NOT NULL AND u.id IS NULL) AS orphan_orders
  `);
  if (!relationCheck[0].public_designs_view || relationCheck[0].orphan_orders) throw new Error("Existing relation check failed.");
  report("existing relations", `${relationCheck[0].foreign_keys} foreign keys; view present; no orphan orders`);

  const userId = randomUUID();
  syntheticUserId = userId;
  await pool.query(`
    INSERT INTO public.users (id, first_name, last_name, email, password_hash)
    VALUES ($1, 'Lab', 'Synthetic', $2, 'not-a-real-password-hash')
  `, [userId, `lab-${userId}@example.invalid`]);
  await pool.query("BEGIN");
  try {
    const { rows: assetRows } = await pool.query(`
      INSERT INTO public.design_assets (name, url, public_id, category, is_public)
      VALUES ('Synthetic lab asset', 'https://example.invalid/lab.png', $1, 'general', false)
      RETURNING id
    `, [`lab/${userId}`]);
    await pool.query(`
      INSERT INTO public.designs (owner_id, image_url, image_public_id, title, category)
      VALUES ($1, 'https://example.invalid/lab.png', $2, 'Synthetic lab design', 'otro')
    `, [userId, `lab/${userId}`]);
    await pool.query(`
      INSERT INTO public.orders (user_id, subtotal, total, payment_method)
      VALUES ($1, 1, 1, 'transfer')
    `, [userId]);
    await pool.query(
      "INSERT INTO public.asset_product_links (asset_id, product_model_id) VALUES ($1, 'tee-classic')",
      [assetRows[0].id],
    );
    report("synthetic writes", "users, design_assets, designs, orders and asset/model relation accepted inside rollback transaction");
  } finally {
    await pool.query("ROLLBACK");
  }

  const privateProjectId = randomUUID();
  await pool.query("BEGIN");
  try {
    // The restored lab role is a superuser. Switch to the app role so FORCE RLS is actually exercised.
    await pool.query("SET LOCAL ROLE authenticated");
    await pool.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    await pool.query(`
      INSERT INTO public.design_projects (id, owner_id, name, canvas)
      VALUES ($1, $2, 'Synthetic private project', '{"surfaces":[]}'::jsonb)
    `, [privateProjectId, userId]);
    const own = await pool.query("SELECT id FROM public.design_projects WHERE id = $1", [privateProjectId]);
    if (own.rowCount !== 1) throw new Error("Owner cannot read own project under RLS.");

    await pool.query("SELECT set_config('app.user_id', $1, true)", [randomUUID()]);
    const other = await pool.query("SELECT id FROM public.design_projects WHERE id = $1", [privateProjectId]);
    if (other.rowCount !== 0) throw new Error("RLS exposed project to another user.");
    await pool.query("UPDATE public.design_projects SET name = 'unauthorized' WHERE id = $1", [privateProjectId]);
    const unchanged = await pool.query("SELECT name FROM public.design_projects WHERE id = $1", [privateProjectId]);
    if (unchanged.rowCount !== 0) throw new Error("RLS exposed project after user switch.");
    report("project RLS", "owner can insert/read; different user cannot read or update");
  } finally {
    await pool.query("ROLLBACK");
  }

  await pool.query("DELETE FROM public.users WHERE id = $1", [syntheticUserId]);
  syntheticUserId = undefined;
  const final = await counts();
  if (JSON.stringify(initial) !== JSON.stringify(final)) throw new Error("Rollback did not restore baseline counts.");
  report("rollback", "all synthetic records removed; baseline counts unchanged");
} catch (error) {
  console.error("lab smoke failed:", error.message);
  process.exitCode = 1;
} finally {
  if (syntheticUserId) {
    await pool.query("DELETE FROM public.users WHERE id = $1", [syntheticUserId]).catch(() => {});
  }
  await pool.end();
}
