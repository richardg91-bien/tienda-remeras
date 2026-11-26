import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { httpServerHandler } from "cloudflare:node";

const app = express();
const users = new Map();
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true, runtime: "workers-workerd" }));

app.post("/benchmark/bcrypt", async (req, res) => {
  const password = String(req.body?.password || "SyntheticBcryptProbe123");
  const started = performance.now();
  await bcrypt.hash(password, 12);
  return res.json({ bcryptCost: 12, elapsedMs: performance.now() - started });
});

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  if (!email.includes("@") || !firstName || !lastName || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return res.status(422).json({ error: "invalid_synthetic_input" });
  }
  if (users.has(email)) return res.status(409).json({ error: "synthetic_user_exists" });
  const started = performance.now();
  const passwordHash = await bcrypt.hash(password, 12);
  const bcryptMs = performance.now() - started;
  const user = { id: crypto.randomUUID(), first_name: firstName, last_name: lastName, email, phone: req.body?.phone || "", passwordHash };
  users.set(email, user);
  const token = jwt.sign({ id: user.id }, "synthetic-local-only-jwt-secret-for-tests", { expiresIn: "15m" });
  res.cookie("refreshToken", "synthetic-refresh-cookie", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  return res.status(201).json({ message: "Cuenta creada exitosamente.", user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email, phone: user.phone }, accessToken: token, bcryptMs });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const user = users.get(email);
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const started = performance.now();
  const valid = await bcrypt.compare(String(req.body?.password || ""), user.passwordHash);
  const bcryptMs = performance.now() - started;
  if (!valid) return res.status(401).json({ error: "invalid_credentials", bcryptMs });
  const accessToken = jwt.sign({ id: user.id }, "synthetic-local-only-jwt-secret-for-tests", { expiresIn: "15m" });
  res.cookie("refreshToken", "synthetic-refresh-cookie", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  return res.json({ message: "Login exitoso.", accessToken, user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email, phone: user.phone }, bcryptMs });
});

app.put("/api/users/change-password", async (req, res) => {
  const rawToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  let identity;
  try { identity = jwt.verify(rawToken, "synthetic-local-only-jwt-secret-for-tests"); }
  catch { return res.status(401).json({ error: "invalid_synthetic_token" }); }
  const user = [...users.values()].find((entry) => entry.id === identity.id);
  if (!user) return res.status(401).json({ error: "synthetic_user_missing" });
  const verifyMsStart = performance.now();
  const valid = await bcrypt.compare(String(req.body?.currentPassword || ""), user.passwordHash);
  const verifyMs = performance.now() - verifyMsStart;
  if (!valid) return res.status(401).json({ error: "current_password_invalid", verifyMs });
  const newPassword = String(req.body?.newPassword || "");
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || newPassword.length < 8) {
    return res.status(422).json({ error: "invalid_synthetic_new_password" });
  }
  const hashMsStart = performance.now();
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  return res.json({ message: "Contraseña actualizada exitosamente.", verifyMs, bcryptMs: performance.now() - hashMsStart });
});

app.get("/api/auth/cookie-check", (req, res) => res.json({ cookieReceived: Boolean(req.cookies?.refreshToken) }));

app.get("/compat", async (_req, res) => {
  const result = {
    nodeCryptoHmac: false,
    webCrypto: Boolean(globalThis.crypto?.subtle),
    supabaseClientConstructs: false,
    mercadoPagoClientConstructs: false,
    cloudinaryConfigConstructs: false,
    pgPoolConstructsWithoutConnecting: false,
  };
  try {
    const { createHmac } = await import("node:crypto");
    result.nodeCryptoHmac = createHmac("sha256", "synthetic").update("test").digest("hex").length === 64;
  } catch {}
  try {
    const { createClient } = await import("@supabase/supabase-js");
    createClient("https://example.invalid", "synthetic-test-key");
    result.supabaseClientConstructs = true;
  } catch {}
  try {
    const { MercadoPagoConfig } = await import("mercadopago");
    new MercadoPagoConfig({ accessToken: "synthetic-test-token" });
    result.mercadoPagoClientConstructs = true;
  } catch {}
  try {
    const { v2 } = await import("cloudinary");
    v2.config({ cloud_name: "synthetic", api_key: "synthetic", api_secret: "synthetic" });
    result.cloudinaryConfigConstructs = true;
  } catch {}
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ host: "127.0.0.1", port: 55432, user: "synthetic", password: "synthetic", database: "synthetic" });
    result.pgPoolConstructsWithoutConnecting = true;
    await pool.end();
  } catch {}
  return res.json(result);
});

app.listen(8787);
export default httpServerHandler({ port: 8787 });
