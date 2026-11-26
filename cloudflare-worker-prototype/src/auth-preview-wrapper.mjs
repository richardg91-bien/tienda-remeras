import testApplication from "./index.mjs";

export default {
  async fetch(request, env, ctx) {
    const supplied = request.headers.get("x-lab-probe-token");
    if (!env.PREVIEW_PROBE_TOKEN || supplied !== env.PREVIEW_PROBE_TOKEN) {
      return new Response("Not found.", { status: 404 });
    }
    return testApplication.fetch(request, env, ctx);
  },
};
