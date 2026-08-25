import jwt            from "jsonwebtoken";
import bcrypt         from "bcryptjs";
import { validationResult } from "express-validator";
import supabase       from "../config/supabase.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );
  return { accessToken, refreshToken };
};

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  path:     "/",
};

/** Devuelve el usuario sin campos sensibles */
const sanitize = (user) => {
  const { password_hash, refresh_token, ...safe } = user;
  return safe;
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { firstName, lastName, email, password, phone = "" } = req.body;

    // ¿Ya existe ese email?
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese email." });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        first_name:    firstName,
        last_name:     lastName,
        email:         email.toLowerCase(),
        password_hash,
        phone,
      })
      .select()
      .single();

    if (error) throw error;

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Guarda refresh token en DB
    await supabase
      .from("users")
      .update({ refresh_token: refreshToken })
      .eq("id", user.id);

    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message:     "Cuenta creada exitosamente.",
      accessToken,
      user:        sanitize(user),
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")                        // necesitamos password_hash
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw error;

    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!user || !valid) {
      return res.status(401).json({ message: "Email o contraseña incorrectos." });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await supabase
      .from("users")
      .update({ refresh_token: refreshToken })
      .eq("id", user.id);

    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message:     "Login exitoso.",
      accessToken,
      user:        sanitize(user),
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return res.status(401).json({ message: "Refresh token requerido." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const { data: user } = await supabase
      .from("users")
      .select("id, refresh_token")
      .eq("id", decoded.id)
      .maybeSingle();

    if (!user || user.refresh_token !== token) {
      return res.status(401).json({ message: "Refresh token inválido o revocado." });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id);

    await supabase
      .from("users")
      .update({ refresh_token: newRefresh })
      .eq("id", user.id);

    res.cookie("refreshToken", newRefresh, {
      ...COOKIE_OPTS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Refresh token expirado o inválido." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const me = (req, res) => res.json({ user: req.user });

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    if (req.user) {
      await supabase
        .from("users")
        .update({ refresh_token: "" })
        .eq("id", req.user.id);
    }
    res.clearCookie("refreshToken", COOKIE_OPTS);
    return res.json({ message: "Sesión cerrada." });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({ message: "Error cerrando sesión." });
  }
};
