import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ── Verifica access token ─────────────────────────────────
export const protect = async (req, res, next) => {
  try {
    // Acepta token en header Authorization o en cookie
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: "No autenticado. Token requerido." });
    }

    // Verifica y decodifica
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca el usuario (sin el password)
    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado." });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado.", code: "TOKEN_EXPIRED" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token inválido." });
    }
    next(error);
  }
};

// ── Solo admins ───────────────────────────────────────────
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado. Se requiere rol admin." });
  }
  next();
};

// ── Opcional: agrega el usuario si hay token, pero no falla si no hay ────
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password -refreshToken");
    }
  } catch {
    // Silencioso: si el token falla, req.user queda undefined
  }
  next();
};
