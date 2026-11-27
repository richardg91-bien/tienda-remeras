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

function currentUserId() {
  const token = localStorage.getItem("accessToken");
  const payload = token?.split(".")[1];
  if (!payload) throw new Error("Iniciá sesión para guardar proyectos en tu biblioteca.");
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)));
    const userId = claims.id || claims.sub;
    if (typeof userId !== "string" || !userId) throw new Error();
    return userId;
  } catch {
    throw new Error("La sesión no tiene un identificador de usuario válido.");
  }
}

function projectScopeStorageKey() {
  return `designerDraftProjectId:${currentUserId()}`;
}

function currentProjectId() {
  const storageKey = projectScopeStorageKey();
  let projectId = localStorage.getItem(storageKey);
  if (!projectId) {
    projectId = crypto.randomUUID();
    localStorage.setItem(storageKey, projectId);
  }
  return projectId;
}

function setCurrentProjectId(projectId) {
  localStorage.setItem(projectScopeStorageKey(), projectId);
}

async function authenticatedFetch(url, options = {}) {
  const request = () => fetch(url, {
    ...options,
    credentials: "include",
    headers: { ...(options.headers || {}), ...authHeaders() },
  });
  let response = await request();
  if (response.status !== 401) return response;
  const refreshResponse = await fetch(`${API}/api/auth/refresh`, { method: "POST", credentials: "include" });
  if (!refreshResponse.ok) return response;
  const { accessToken } = await refreshResponse.json().catch(() => ({}));
  if (!accessToken) return response;
  localStorage.setItem("accessToken", accessToken);
  response = await request();
  return response;
}

export async function listDesignProjects() {
  const data = await readResponse(await authenticatedFetch(`${API}/api/projects`));
  return data.projects || [];
}

export async function saveDesignProject(project) {
  const draftId = project.id || currentProjectId();
  const body = project.id ? project : { ...project, draftId };
  const data = await readResponse(await authenticatedFetch(`${API}/api/projects${project.id ? `/${encodeURIComponent(project.id)}` : ""}`, {
    method: project.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
  setCurrentProjectId(data.project.id);
  return data.project;
}

export async function getDesignProject(id) {
  const data = await readResponse(await authenticatedFetch(`${API}/api/projects/${encodeURIComponent(id)}`));
  setCurrentProjectId(data.project.id);
  return data.project;
}

export async function uploadPrivateDesignAsset(file) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("projectId", currentProjectId());
  const data = await readResponse(await authenticatedFetch(`${API}/api/private-assets`, {
    method: "POST",
    body: formData,
  }));
  return data.asset;
}

export async function listPrivateDesignAssets() {
  const params = new URLSearchParams({ projectId: currentProjectId() });
  const data = await readResponse(await authenticatedFetch(`${API}/api/private-assets?${params}`));
  return data.assets || [];
}

export async function listProductModels() {
  const data = await readResponse(await fetch(`${API}/api/products/models`));
  return data.models || [];
}

export async function getPrivateDesignAssetUrl(path) {
  const params = new URLSearchParams({ path });
  const data = await readResponse(await authenticatedFetch(`${API}/api/private-assets/file?${params}`));
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
      const objects = paths.get(object.privateAssetPath) || [];
      objects.push(object);
      paths.set(object.privateAssetPath, objects);
    }
  });

  await Promise.all([...paths].map(async ([path, objects]) => {
    const url = await getPrivateDesignAssetUrl(path);
    objects.forEach((object) => { object.src = url; });
  }));
  return json;
}
