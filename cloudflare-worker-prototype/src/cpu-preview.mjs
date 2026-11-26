import bcrypt from "bcryptjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, environment: env.LAB_MODE || "unknown" });
    }
    if (request.method !== "POST" || url.pathname !== "/__test/bcrypt-cost-12") {
      return json({ message: "Not found." }, 404);
    }
    const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!env.PREVIEW_PROBE_TOKEN || suppliedToken !== env.PREVIEW_PROBE_TOKEN) {
      return json({ message: "Not found." }, 404);
    }
    const started = performance.now();
    await bcrypt.hash("SyntheticWorkersPreviewPassword2026", 12);
    return json({ bcryptCost: 12, elapsedMs: performance.now() - started, completed: true });
  },
};
