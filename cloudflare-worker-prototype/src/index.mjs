const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const SIGNED_ASSET_TTL_SECONDS = 5 * 60;
const PBKDF2_ITERATIONS = 600_000;
const MAX_JSON_BYTES = 9 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
});

function encodeBase64Url(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret) {
  if (!secret) throw new ApiError(503, "Autenticación no configurada.", "auth_unavailable");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signToken(claims, secret) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify(claims));
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(input));
  return `${input}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(token, secret, expectedType) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new ApiError(401, "Token inválido.", "invalid_token");
  let header;
  let claims;
  let signature;
  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    signature = decodeBase64Url(parts[2]);
  } catch {
    throw new ApiError(401, "Token inválido.", "invalid_token");
  }
  if (header.alg !== "HS256" || header.typ !== "JWT" || claims.typ !== expectedType
      || !claims.sub || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new ApiError(401, "Token inválido o vencido.", "invalid_token");
  }
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), signature, encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new ApiError(401, "Token inválido.", "invalid_token");
  return claims;
}

async function digestHex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, material, 256);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, iterationText, saltText, hashText, extra] = String(encoded || "").split("$");
  const iterations = Number(iterationText);
  if (algorithm !== "pbkdf2-sha256" || iterations !== PBKDF2_ITERATIONS || !saltText || !hashText || extra) return false;
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: decodeBase64Url(saltText), iterations }, material, 256);
  const actual = new Uint8Array(bits);
  const expected = decodeBase64Url(hashText);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i += 1) mismatch |= actual[i] ^ expected[i];
  return mismatch === 0;
}

function parseCookie(request, name) {
  const value = request.headers.get("cookie") || "";
  for (const part of value.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return "";
}

function refreshCookie(request, token, maxAge = REFRESH_TTL_SECONDS) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `refreshToken=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Lax; Path=/api/auth; Max-Age=${maxAge}`;
}

function userResponse(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone || "",
    role: user.role || "user",
    is_verified: Boolean(user.is_verified),
    avatar_url: user.avatar_url || "",
    bio: user.bio || "",
    address: parseJson(user.address, {}),
    created_at: user.created_at,
  };
}

function parseJson(value, fallback) {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function issueTokens(env, user) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await signToken({ sub: user.id, id: user.id, typ: "access", iat: now, exp: now + ACCESS_TTL_SECONDS }, env.JWT_SECRET);
  const refreshToken = await signToken({ sub: user.id, id: user.id, typ: "refresh", iat: now, exp: now + REFRESH_TTL_SECONDS }, env.JWT_REFRESH_SECRET);
  const refreshHash = await digestHex(refreshToken);
  await env.DB.prepare("UPDATE users SET refresh_token_hash = ?, updated_at = ? WHERE id = ?")
    .bind(refreshHash, new Date().toISOString(), user.id).run();
  return { accessToken, refreshToken };
}

async function authenticatedUser(request, env) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new ApiError(401, "No autenticado. Token requerido.", "unauthorized");
  const claims = await verifyToken(match[1], env.JWT_SECRET, "access");
  const user = await env.DB.prepare(`
    SELECT id, first_name, last_name, email, phone, role, is_verified, avatar_url, bio, address, created_at
    FROM users WHERE id = ?
  `).bind(claims.sub).first();
  if (!user) throw new ApiError(401, "Usuario no encontrado.", "unauthorized");
  return user;
}

async function applyAuthRateLimit(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const bucketStart = Math.floor(Date.now() / 900_000) * 900_000;
  const clientKey = await digestHex(`${env.RATE_LIMIT_SECRET || env.JWT_SECRET}:${ip}`);
  const result = await env.DB.prepare(`
    INSERT INTO auth_rate_limits (client_key, window_start, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(client_key, window_start) DO UPDATE SET attempts = attempts + 1
    RETURNING attempts
  `).bind(clientKey, bucketStart).first();
  const maxAttempts = Math.max(1, Math.min(100, Number(env.AUTH_RATE_LIMIT) || 10));
  if (result?.attempts > maxAttempts) throw new ApiError(429, "Demasiados intentos. Esperá 15 minutos.", "rate_limited");
  if (result?.attempts === 1) {
    await env.DB.prepare("DELETE FROM auth_rate_limits WHERE window_start < ?").bind(bucketStart - 3_600_000).run();
  }
}

async function register(request, env) {
  await applyAuthRateLimit(request, env);
  const body = await readJson(request);
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const phone = String(body.phone || "").trim();
  if (!firstName || firstName.length > 50 || !lastName || lastName.length > 50
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
      || password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)
      || phone.length > 30) {
    throw new ApiError(422, "Revisá los datos ingresados.", "invalid_registration");
  }
  const id = crypto.randomUUID();
  const hash = await passwordHash(password);
  try {
    await env.DB.prepare(`
      INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?)
    `).bind(id, firstName, lastName, email, phone, hash, new Date().toISOString(), new Date().toISOString()).run();
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      throw new ApiError(409, "Ya existe una cuenta con ese email.", "email_exists");
    }
    throw error;
  }
  const user = await env.DB.prepare(`
    SELECT id, first_name, last_name, email, phone, role, is_verified, avatar_url, bio, address, created_at
    FROM users WHERE id = ?
  `).bind(id).first();
  const tokens = await issueTokens(env, user);
  const response = json({ message: "Cuenta creada exitosamente.", accessToken: tokens.accessToken, user: userResponse(user) }, 201);
  response.headers.append("set-cookie", refreshCookie(request, tokens.refreshToken));
  return response;
}

async function login(request, env) {
  await applyAuthRateLimit(request, env);
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new ApiError(401, "Email o contraseña incorrectos.", "invalid_credentials");
  }
  const tokens = await issueTokens(env, user);
  const response = json({ message: "Login exitoso.", accessToken: tokens.accessToken, user: userResponse(user) });
  response.headers.append("set-cookie", refreshCookie(request, tokens.refreshToken));
  return response;
}

async function refresh(request, env) {
  const token = parseCookie(request, "refreshToken");
  if (!token) throw new ApiError(401, "Refresh token requerido.", "refresh_required");
  const claims = await verifyToken(token, env.JWT_REFRESH_SECRET, "refresh");
  const storedHash = await digestHex(token);
  const user = await env.DB.prepare(`
    SELECT id, first_name, last_name, email, phone, role, is_verified, avatar_url, bio, address, created_at, refresh_token_hash
    FROM users WHERE id = ?
  `).bind(claims.sub).first();
  if (!user || user.refresh_token_hash !== storedHash) {
    throw new ApiError(401, "Refresh token inválido o revocado.", "invalid_refresh_token");
  }
  const tokens = await issueTokens(env, user);
  const response = json({ accessToken: tokens.accessToken });
  response.headers.append("set-cookie", refreshCookie(request, tokens.refreshToken));
  return response;
}

async function logout(request, env, user) {
  await env.DB.prepare("UPDATE users SET refresh_token_hash = NULL, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), user.id).run();
  const response = json({ message: "Sesión cerrada." });
  response.headers.append("set-cookie", refreshCookie(request, "", 0));
  return response;
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BYTES) throw new ApiError(413, "La solicitud supera el tamaño permitido.", "payload_too_large");
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "JSON inválido.", "invalid_json");
  }
}

function projectRecord(row) {
  return {
    ...row,
    variant: parseJson(row.variant, {}),
    canvas: parseJson(row.canvas, {}),
    production: parseJson(row.production, {}),
  };
}

async function loadProductModel(env, productRef) {
  const row = await env.DB.prepare(`
    SELECT id, category, name, variant_schema, print_surfaces, production_template
    FROM product_models WHERE id = ? AND active = 1
  `).bind(productRef).first();
  if (!row) throw new ApiError(400, "El producto seleccionado no existe o no está activo.", "invalid_product");
  return {
    ...row,
    variant_schema: parseJson(row.variant_schema, {}),
    print_surfaces: parseJson(row.print_surfaces, []),
    production_template: parseJson(row.production_template, {}),
  };
}

function collectPrivateAssetPaths(value, paths = new Set()) {
  if (!value || typeof value !== "object") return paths;
  if (Array.isArray(value)) {
    value.forEach((item) => collectPrivateAssetPaths(item, paths));
    return paths;
  }
  if (typeof value.src === "string" && /^data:image\//i.test(value.src)) {
    throw new ApiError(400, "Las imágenes privadas deben subirse a R2 antes de guardar el proyecto.", "inline_image_not_allowed");
  }
  if (value.privateAssetPath !== undefined) {
    if (typeof value.privateAssetPath !== "string") throw new ApiError(400, "Referencia de imagen privada inválida.", "invalid_private_asset_path");
    paths.add(value.privateAssetPath);
  }
  Object.values(value).forEach((item) => collectPrivateAssetPaths(item, paths));
  return paths;
}

function expectedR2Key(path, userId, projectId) {
  if (typeof path !== "string") return false;
  const segments = path.split("/");
  if (segments.length !== 3 || segments[0] !== userId || segments[1] !== projectId) return false;
  return /^[0-9a-f-]{36}\.(png|jpe?g|webp|svg)$/i.test(segments[2]);
}

async function ensureProjectAssets(env, userId, projectId, canvas) {
  const paths = collectPrivateAssetPaths(canvas);
  for (const path of paths) {
    if (!expectedR2Key(path, userId, projectId)) {
      throw new ApiError(403, "La imagen no pertenece a este usuario y proyecto.", "private_asset_forbidden");
    }
    if (!(await env.PRIVATE_ASSETS.head(path))) {
      throw new ApiError(400, "No se encontró una imagen privada referenciada por el diseño.", "private_asset_missing");
    }
  }
  return paths;
}

function surfaceIdsFromCanvas(canvas, productRef) {
  const surfaces = canvas?.products?.[productRef]?.surfaces || canvas?.surfaces || {};
  if (!surfaces || typeof surfaces !== "object" || Array.isArray(surfaces)) {
    throw new ApiError(400, "Superficies del diseño inválidas.", "invalid_surfaces");
  }
  return Object.keys(surfaces);
}

function prepareProduction(production, model, variant) {
  const dpi = Number(model.production_template.resolutionDpi) || 300;
  const surfaces = {};
  for (const surface of model.print_surfaces) {
    const widthMm = Number(surface.widthMm || surface.diameterMm || 0);
    const heightMm = Number(surface.heightMm || surface.diameterMm || 0);
    if (!widthMm || !heightMm) continue;
    surfaces[surface.id] = {
      widthMm,
      heightMm,
      dpi,
      widthPx: Math.round(widthMm / 25.4 * dpi),
      heightPx: Math.round(heightMm / 25.4 * dpi),
    };
  }
  const base = production && typeof production === "object" && !Array.isArray(production) ? production : {};
  const products = base.products && typeof base.products === "object" && !Array.isArray(base.products) ? { ...base.products } : {};
  products[model.id] = { ...(products[model.id] || {}), template: model.production_template, surfaces };
  return { ...base, productRef: model.id, productCategory: model.category, variant, products };
}

async function listProjects(env, userId) {
  const { results } = await env.DB.prepare(`
    SELECT id, name, product_ref, product_category, variant, canvas, preview_url, production, created_at, updated_at
    FROM design_projects WHERE owner_id = ? ORDER BY updated_at DESC
  `).bind(userId).all();
  return json({ projects: (results || []).map(projectRecord) });
}

async function getProject(env, userId, projectId) {
  const row = await env.DB.prepare(`
    SELECT id, name, product_ref, product_category, variant, canvas, preview_url, production, created_at, updated_at
    FROM design_projects WHERE id = ? AND owner_id = ?
  `).bind(projectId, userId).first();
  if (!row) throw new ApiError(404, "Proyecto no encontrado.", "project_not_found");
  return json({ project: projectRecord(row) });
}

async function saveProject(request, env, userId, projectId = null) {
  const body = await readJson(request);
  const name = String(body.name || "Proyecto sin título").trim().slice(0, 120) || "Proyecto sin título";
  const productRef = String(body.productRef || "tee-classic");
  const model = await loadProductModel(env, productRef);
  const productCategory = String(body.productCategory || model.category);
  if (productCategory !== model.category) throw new ApiError(400, "La categoría no coincide con el producto seleccionado.", "product_category_mismatch");
  const variant = body.variant && typeof body.variant === "object" && !Array.isArray(body.variant) ? body.variant : {};
  const canvas = body.canvas && typeof body.canvas === "object" && !Array.isArray(body.canvas) ? body.canvas : {};
  const selectedSurfaces = surfaceIdsFromCanvas(canvas, model.id);
  const configured = new Set(model.print_surfaces.map((surface) => surface.id));
  if (selectedSurfaces.some((surfaceId) => !configured.has(surfaceId))) {
    throw new ApiError(400, "El diseño incluye una superficie que no pertenece al producto.", "invalid_product_surface");
  }
  if (variant.size && Array.isArray(model.variant_schema.sizes)
      && !model.variant_schema.sizes.some((size) => String(typeof size === "object" ? size.id || size.value || size.label : size) === String(variant.size))) {
    throw new ApiError(400, "El talle no está disponible para el producto seleccionado.", "invalid_product_size");
  }
  if (variant.catalogProductId !== undefined && !/^\d{1,8}$/.test(String(variant.catalogProductId))) {
    throw new ApiError(400, "La referencia de catálogo no es válida.", "invalid_catalog_product");
  }
  const id = projectId || String(body.draftId || crypto.randomUUID());
  if (!UUID_PATTERN.test(id)) throw new ApiError(400, "Identificador de proyecto inválido.", "invalid_project_id");
  const assetPaths = await ensureProjectAssets(env, userId, id, canvas);
  const previewUrl = typeof body.previewUrl === "string" ? body.previewUrl.slice(0, 2048) : "";
  const production = prepareProduction(body.production, model, variant);
  const now = new Date().toISOString();

  if (projectId) {
    const previous = await env.DB.prepare(`
      SELECT id, canvas FROM design_projects WHERE id = ? AND owner_id = ?
    `).bind(projectId, userId).first();
    if (!previous) throw new ApiError(404, "Proyecto no encontrado.", "project_not_found");
    await env.DB.prepare(`
      UPDATE design_projects
      SET name = ?, product_ref = ?, product_category = ?, variant = ?, canvas = ?, preview_url = ?, production = ?, updated_at = ?
      WHERE id = ? AND owner_id = ?
    `).bind(name, productRef, productCategory, JSON.stringify(variant), JSON.stringify(canvas), previewUrl,
      JSON.stringify(production), now, projectId, userId).run();
    const priorPaths = collectPrivateAssetPaths(parseJson(previous.canvas, {}));
    await deleteR2Keys(env, [...priorPaths].filter((path) => !assetPaths.has(path) && expectedR2Key(path, userId, projectId)));
    return getProject(env, userId, projectId);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO design_projects (id, owner_id, name, product_ref, product_category, variant, canvas, preview_url, production, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, name, productRef, productCategory, JSON.stringify(variant), JSON.stringify(canvas),
      previewUrl, JSON.stringify(production), now, now).run();
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      throw new ApiError(409, "El borrador ya existe. Abrilo desde tu biblioteca para continuar.", "project_exists");
    }
    throw error;
  }
  return getProject(env, userId, id).then(async (response) => {
    const created = await response.json();
    return json(created, 201);
  });
}

async function listR2Objects(env, prefix) {
  const objects = [];
  let cursor;
  do {
    const page = await env.PRIVATE_ASSETS.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects;
}

async function deleteR2Keys(env, keys) {
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    if (chunk.length) await env.PRIVATE_ASSETS.delete(chunk);
  }
}

async function deleteProject(env, userId, projectId) {
  const result = await env.DB.prepare("DELETE FROM design_projects WHERE id = ? AND owner_id = ?")
    .bind(projectId, userId).run();
  if (!result.meta?.changes) throw new ApiError(404, "Proyecto no encontrado.", "project_not_found");
  try {
    const objects = await listR2Objects(env, `${userId}/${projectId}/`);
    await deleteR2Keys(env, objects.map((object) => object.key));
  } catch (error) {
    console.warn("project_asset_cleanup_failed", { code: error?.code || "unknown" });
  }
  return json({ deleted: true });
}

function imageExtension(file) {
  const type = String(file.type || "").toLowerCase();
  const fileName = String(file.name || "");
  const ext = fileName.toLowerCase().split(".").pop();
  const allowed = new Map([["image/png", "png"], ["image/jpeg", ext === "jpeg" ? "jpeg" : "jpg"], ["image/webp", "webp"], ["image/svg+xml", "svg"]]);
  return allowed.get(type) || null;
}

function imageSignatureIsValid(bytes, contentType) {
  if (contentType === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (contentType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (contentType === "image/svg+xml") return /<svg(?:\s|>)/i.test(new TextDecoder().decode(bytes.slice(0, 1024)));
  return false;
}

async function uploadPrivateAsset(request, env, userId) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES + 64 * 1024) throw new ApiError(413, "La imagen supera el límite de 8 MB.", "image_too_large");
  let form;
  try { form = await request.formData(); }
  catch { throw new ApiError(400, "Formulario de imagen inválido.", "invalid_multipart"); }
  const image = form.get("image");
  const projectId = String(form.get("projectId") || "");
  if (!(image instanceof File) || !image.size) throw new ApiError(400, "Se requiere una imagen.", "image_required");
  if (!UUID_PATTERN.test(projectId)) throw new ApiError(400, "Identificador de proyecto inválido.", "invalid_project_id");
  if (image.size > MAX_IMAGE_BYTES) throw new ApiError(413, "La imagen supera el límite de 8 MB.", "image_too_large");
  const extension = imageExtension(image);
  if (!extension) throw new ApiError(415, "Formato no permitido. Usá PNG, JPEG, WebP o SVG.", "unsupported_image_type");
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!imageSignatureIsValid(bytes, image.type.toLowerCase())) throw new ApiError(415, "El contenido no coincide con el formato de imagen declarado.", "invalid_image_signature");
  const existing = await env.DB.prepare("SELECT owner_id FROM design_projects WHERE id = ?").bind(projectId).first();
  if (existing && existing.owner_id !== userId) throw new ApiError(403, "Acceso denegado.", "project_forbidden");
  const key = `${userId}/${projectId}/${crypto.randomUUID()}.${extension}`;
  await env.PRIVATE_ASSETS.put(key, bytes, {
    httpMetadata: { contentType: image.type.toLowerCase(), cacheControl: "private, no-store" },
    customMetadata: { ownerId: userId, projectId, name: String(image.name || "image").slice(0, 160) },
  });
  const signedUrl = await signAssetUrl(request, env, key);
  return json({ asset: { path: key, name: image.name || "image", mimeType: image.type.toLowerCase(), bytes: image.size, url: signedUrl, expiresIn: SIGNED_ASSET_TTL_SECONDS } }, 201);
}

async function listPrivateAssets(request, env, userId) {
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get("projectId") || "");
  if (!UUID_PATTERN.test(projectId)) throw new ApiError(400, "Identificador de proyecto inválido.", "invalid_project_id");
  const project = await env.DB.prepare("SELECT owner_id FROM design_projects WHERE id = ?").bind(projectId).first();
  if (project && project.owner_id !== userId) throw new ApiError(404, "Proyecto no encontrado.", "project_not_found");
  const objects = await listR2Objects(env, `${userId}/${projectId}/`);
  const assets = await Promise.all(objects.map(async (object) => {
    const stored = await env.PRIVATE_ASSETS.head(object.key);
    if (!stored) return null;
    return {
      path: object.key,
      name: stored.customMetadata?.name || object.key.split("/").pop(),
      mimeType: stored.httpMetadata?.contentType || "application/octet-stream",
      bytes: stored.size,
      url: await signAssetUrl(request, env, object.key),
      expiresIn: SIGNED_ASSET_TTL_SECONDS,
    };
  }));
  return json({ assets: assets.filter(Boolean) });
}

async function assetSignature(path, expires, secret) {
  const key = await hmacKey(secret);
  const data = `${path}\n${expires}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return encodeBase64Url(new Uint8Array(signature));
}

async function signAssetUrl(request, env, path) {
  const expires = Math.floor(Date.now() / 1000) + SIGNED_ASSET_TTL_SECONDS;
  const signature = await assetSignature(path, expires, env.ASSET_URL_SECRET);
  const url = new URL("/api/private-assets/file", request.url);
  url.searchParams.set("path", path);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sig", signature);
  return url.toString();
}

async function getPrivateAssetUrl(request, env, userId) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const segments = path.split("/");
  if (segments.length !== 3 || segments[0] !== userId || !UUID_PATTERN.test(segments[1])
      || !expectedR2Key(path, userId, segments[1])) {
    throw new ApiError(403, "Acceso denegado.", "private_asset_forbidden");
  }
  const project = await env.DB.prepare("SELECT owner_id FROM design_projects WHERE id = ?").bind(segments[1]).first();
  if (project && project.owner_id !== userId) throw new ApiError(403, "Acceso denegado.", "private_asset_forbidden");
  if (!(await env.PRIVATE_ASSETS.head(path))) throw new ApiError(404, "Archivo no encontrado.", "asset_not_found");
  return json({ url: await signAssetUrl(request, env, path), expiresIn: SIGNED_ASSET_TTL_SECONDS });
}

async function serveSignedAsset(request, env) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("sig") || "";
  const segments = path.split("/");
  if (segments.length !== 3 || !UUID_PATTERN.test(segments[0]) || !UUID_PATTERN.test(segments[1])
      || !expectedR2Key(path, segments[0], segments[1]) || !Number.isInteger(expires)
      || expires <= Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + SIGNED_ASSET_TTL_SECONDS + 5) {
    throw new ApiError(403, "URL temporal inválida o vencida.", "invalid_signed_url");
  }
  let valid = false;
  try {
    valid = await crypto.subtle.verify("HMAC", await hmacKey(env.ASSET_URL_SECRET), decodeBase64Url(signature), encoder.encode(`${path}\n${expires}`));
  } catch {}
  if (!valid) throw new ApiError(403, "URL temporal inválida o vencida.", "invalid_signed_url");
  const object = await env.PRIVATE_ASSETS.get(path);
  if (!object) throw new ApiError(404, "Archivo no encontrado.", "asset_not_found");
  const headers = new Headers({
    "cache-control": `private, max-age=${Math.max(0, expires - Math.floor(Date.now() / 1000))}`,
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
  });
  object.writeHttpMetadata(headers);
  headers.set("cache-control", `private, max-age=${Math.max(0, expires - Math.floor(Date.now() / 1000))}`);
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

async function privateAssetsRoute(request, env, userId) {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/api/private-assets") return uploadPrivateAsset(request, env, userId);
  if (request.method === "GET" && url.pathname === "/api/private-assets") return listPrivateAssets(request, env, userId);
  if (request.method === "GET" && url.pathname === "/api/private-assets/file") return getPrivateAssetUrl(request, env, userId);
  throw new ApiError(404, "Ruta no encontrada.", "not_found");
}

async function projectRoute(request, env, user, url) {
  if (url.pathname === "/api/projects" && request.method === "GET") return listProjects(env, user.id);
  if (url.pathname === "/api/projects" && request.method === "POST") return saveProject(request, env, user.id);
  const match = /^\/api\/projects\/([^/]+)$/.exec(url.pathname);
  if (!match) throw new ApiError(404, "Ruta no encontrada.", "not_found");
  const projectId = decodeURIComponent(match[1]);
  if (!UUID_PATTERN.test(projectId)) throw new ApiError(400, "Identificador de proyecto inválido.", "invalid_project_id");
  if (request.method === "GET") return getProject(env, user.id, projectId);
  if (request.method === "PUT") return saveProject(request, env, user.id, projectId);
  if (request.method === "DELETE") return deleteProject(env, user.id, projectId);
  throw new ApiError(405, "Método no permitido.", "method_not_allowed");
}

async function productModels(env) {
  const { results } = await env.DB.prepare(`
    SELECT id, category, name, variant_schema, print_surfaces, production_template
    FROM product_models WHERE active = 1 ORDER BY category, name
  `).all();
  return json({ models: (results || []).map((row) => ({
    ...row,
    variant_schema: parseJson(row.variant_schema, {}),
    print_surfaces: parseJson(row.print_surfaces, []),
    production_template: parseJson(row.production_template, {}),
  })) });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return "";
  const configured = String(env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : "";
}

function addCors(request, env, response) {
  const origin = allowedOrigin(request, env);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("access-control-allow-headers", "Authorization, Content-Type");
  headers.append("vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function fetchHandler(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, runtime: "cloudflare-workers", persistence: "d1+r2" });
  }
  if (request.method === "GET" && url.pathname === "/api/private-assets/file" && url.searchParams.has("sig")) {
    return serveSignedAsset(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/auth/register") return register(request, env);
  if (request.method === "POST" && url.pathname === "/api/auth/login") return login(request, env);
  if (request.method === "POST" && url.pathname === "/api/auth/refresh") return refresh(request, env);
  if (request.method === "GET" && url.pathname === "/api/products/models") return productModels(env);

  if (url.pathname.startsWith("/api/projects") || url.pathname.startsWith("/api/private-assets")) {
    const user = await authenticatedUser(request, env);
    if (url.pathname.startsWith("/api/projects")) return projectRoute(request, env, user, url);
    return privateAssetsRoute(request, env, user.id);
  }
  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    const user = await authenticatedUser(request, env);
    return json({ user: userResponse(user) });
  }
  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const user = await authenticatedUser(request, env);
    return logout(request, env, user);
  }
  throw new ApiError(404, `Ruta ${request.method} ${url.pathname} no encontrada.`, "not_found");
}

export default {
  async fetch(request, env) {
    try {
      return addCors(request, env, await fetchHandler(request, env));
    } catch (error) {
      if (error instanceof ApiError) {
        return addCors(request, env, json({ message: error.message, code: error.code }, error.status));
      }
      console.error("worker_request_failed", { code: error?.code || "unknown" });
      return addCors(request, env, json({ message: "Error interno del servidor." }, 500));
    }
  },
};
