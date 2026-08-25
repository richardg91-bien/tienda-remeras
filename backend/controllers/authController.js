import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";

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

const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  path:     "/",
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  // Valida campos con express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Verifica que el email no esté en uso
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese email." });
    }

    const user = await User.create({ firstName, lastName, email, password, phone });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Guarda refresh token hasheado en DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Envía refresh token como cookie httpOnly
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    });

    return res.status(201).json({
      message: "Cuenta creada exitosamente.",
      accessToken,
      user: user.toPublic(),
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Busca con password (select: false en el schema, hay que pedirlo explícito)
    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user) {
      return res.status(401).json({ message: "Email o contraseña incorrectos." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Email o contraseña incorrectos." });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message:     "Login exitoso.",
      accessToken,
      user: user.toPublic(),
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token requerido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: "Refresh token inválido o revocado." });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", newRefresh, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Refresh token expirado o inválido." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const me = async (req, res) => {
  // req.user ya viene del middleware protect
  return res.json({ user: req.user });
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    // Revoca el refresh token en DB
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: "" });
    }
    res.clearCookie("refreshToken", cookieOptions);
    return res.json({ message: "Sesión cerrada." });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({ message: "Error cerrando sesión." });
  }
};
