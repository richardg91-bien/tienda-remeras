const API = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Error de servidor (${response.status}).`);
  }
  return data;
}

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("Iniciá sesión para guardar proyectos en tu biblioteca.");
  return { Authorization: `Bearer ${token}` };
}

export async function listDesignProjects() {
  const data = await readResponse(await fetch(`${API}/api/projects`, {
    headers: authHeaders(),
    credentials: "include",
  }));
  return data.projects || [];
}

export async function saveDesignProject(project) {
  const data = await readResponse(await fetch(`${API}/api/projects${project.id ? `/${encodeURIComponent(project.id)}` : ""}`, {
    method: project.id ? "PUT" : "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(project),
  }));
  return data.project;
}

export async function getDesignProject(id) {
  const data = await readResponse(await fetch(`${API}/api/projects/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
    credentials: "include",
  }));
  return data.project;
}

export async function uploadPrivateDesignAsset(file) {
  const formData = new FormData();
  formData.append("image", file);
  const data = await readResponse(await fetch(`${API}/api/private-assets`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: formData,
  }));
  return data.asset;
}

export async function listPrivateDesignAssets() {
  const data = await readResponse(await fetch(`${API}/api/private-assets`, {
    headers: authHeaders(),
    credentials: "include",
  }));
  return data.assets || [];
}

export async function listProductModels() {
  const data = await readResponse(await fetch(`${API}/api/products/models`));
  return data.models || [];
}

export async function getPrivateDesignAssetUrl(path) {
  const params = new URLSearchParams({ path });
  const data = await readResponse(await fetch(`${API}/api/private-assets/file?${params}`, {
    headers: authHeaders(),
    credentials: "include",
  }));
  return data.url;
}

function visitObjects(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    visitObjects(object.objects, visit);
  }
}

export function serializeCanvasForProject(canvas) {
  if (!canvas) return { version: "7.4.0", objects: [] };
  const json = canvas.toJSON(["assetId", "privateAssetPath"]);
  visitObjects(json.objects, (object) => {
    if (object.privateAssetPath) object.src = `private-asset:${object.privateAssetPath}`;
  });
  return json;
}

export async function hydrateProjectCanvas(canvasJson) {
  const json = JSON.parse(JSON.stringify(canvasJson || { objects: [] }));
  const paths = new Map();
  const canRefreshPrivateUrls = Boolean(localStorage.getItem("accessToken"));
  visitObjects(json.objects, (object) => {
    if (object.privateAssetPath && (
      object.src?.startsWith("private-asset:") ||
      (canRefreshPrivateUrls && !object.src?.startsWith("data:"))
    )) {
      object.crossOrigin = "anonymous";
      paths.set(object.privateAssetPath, object);
    }
  });

  await Promise.all([...paths].map(async ([path, object]) => {
    object.src = await getPrivateDesignAssetUrl(path);
  }));
  return json;
}
