import { Client } from "pg";
import jwt from "jsonwebtoken";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, runtime: "workers-local-workerd" });
    }

    const isolationTest = request.method === "POST" && url.pathname === "/lab/project-isolation";
    if (!isolationTest && (request.method !== "GET" || url.pathname !== "/lab/postgres")) {
      return json({ message: "Not found." }, 404);
    }
    if (env.LAB_MODE !== "local-only") return json({ message: "Lab route disabled." }, 404);

    const connectionString = env.HYPERDRIVE?.connectionString;
    if (!connectionString) return json({ message: "Local database binding unavailable.", stage: "binding" }, 503);

    let target;
    try {
      target = new URL(connectionString);
    } catch {
      return json({ message: "Local database target rejected.", stage: "target-parse" }, 503);
    }
    const loopbackTarget = target.hostname === "127.0.0.1" && target.port === "55432";
    const localHyperdriveTarget = target.hostname.endsWith(".hyperdrive.local") && target.port === "5432";
    if ((!loopbackTarget && !localHyperdriveTarget)
        || target.pathname !== "/tienda_remeras_app_lab") {
      return json({
        message: "Local database target rejected.",
        stage: "target-guard",
        host: target.hostname,
        port: target.port,
        database: target.pathname.slice(1),
      }, 503);
    }

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    let inTransaction = false;
    let stage = "connect";
    try {
      await client.connect();
      if (isolationTest) {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token || !env.LAB_JWT_SECRET) return json({ message: "Unauthorized." }, 401);
        let subject;
        try {
          const claims = jwt.verify(token, env.LAB_JWT_SECRET);
          subject = claims?.id;
          if (typeof subject !== "string" || !/^[0-9a-f-]{36}$/i.test(subject)) throw new Error();
        } catch {
          return json({ message: "Unauthorized." }, 401);
        }
        const projectId = crypto.randomUUID();
        stage = "begin-isolation-test";
        await client.query("BEGIN");
        inTransaction = true;
        await client.query(`
          INSERT INTO public.users (id, first_name, last_name, email, password_hash)
          VALUES ($1, 'Worker', 'Synthetic', $2, 'test-only')
        `, [subject, `worker-${subject}@example.invalid`]);
        await client.query("SET LOCAL ROLE authenticated");
        await client.query("SELECT set_config('app.user_id', $1, true)", [subject]);
        await client.query(`
          INSERT INTO public.design_projects (id, owner_id, name, canvas)
          VALUES ($1, $2, 'Worker local isolation test', '{\"surfaces\":[]}'::jsonb)
        `, [projectId, subject]);
        const own = await client.query("SELECT id FROM public.design_projects WHERE id = $1 AND owner_id = $2", [projectId, subject]);
        await client.query("SELECT set_config('app.user_id', $1, true)", [crypto.randomUUID()]);
        const foreign = await client.query("SELECT id FROM public.design_projects WHERE id = $1", [projectId]);
        const foreignUpdate = await client.query("UPDATE public.design_projects SET name = 'forbidden' WHERE id = $1 RETURNING id", [projectId]);
        const foreignDelete = await client.query("DELETE FROM public.design_projects WHERE id = $1 RETURNING id", [projectId]);
        stage = "rollback-isolation-test";
        await client.query("ROLLBACK");
        inTransaction = false;
        await client.query("RESET ROLE");
        const leftovers = await client.query(`
          SELECT
            (SELECT count(*)::int FROM public.design_projects WHERE id = $1) AS projects,
            (SELECT count(*)::int FROM public.users WHERE id = $2) AS users
        `, [projectId, subject]);
        return json({
          jwtVerified: true,
          ownerCreatedAndRead: own.rowCount === 1,
          otherUserCannotRead: foreign.rowCount === 0,
          otherUserCannotUpdate: foreignUpdate.rowCount === 0,
          otherUserCannotDelete: foreignDelete.rowCount === 0,
          rollbackCleanedUp: leftovers.rows[0].projects === 0 && leftovers.rows[0].users === 0,
        });
      }

      stage = "begin";
      await client.query("BEGIN READ ONLY");
      inTransaction = true;
      stage = "database-info";
      const { rows: [database] } = await client.query(
        "SELECT current_database() AS database, current_setting('server_version') AS version",
      );
      stage = "product-models";
      const { rows: models } = await client.query(`
        SELECT id, category, name, variant_schema, print_surfaces, production_template
        FROM public.product_models
        WHERE active = TRUE
        ORDER BY category, name
      `);
      await client.query("COMMIT");
      inTransaction = false;
      return json({ database, models });
    } catch (error) {
      if (inTransaction) await client.query("ROLLBACK").catch(() => {});
      return json({ message: "Local PostgreSQL probe failed.", stage, code: error?.code || "unknown" }, 503);
    } finally {
      await client.end().catch(() => {});
    }
  },
};
