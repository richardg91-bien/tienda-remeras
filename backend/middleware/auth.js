import jwt      from "jsonwebtoken";
import supabase  from "../config/supabase.js";

// ── Verifica access token y agrega req.user ───────────────
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: "No autenticado. Token requerido." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca el usuario en Supabase (sin campos sensibles)
    const { data: user, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, phone, role, is_verified, avatar_url, bio, address, created_at")
      .eq("id", decoded.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ message: "Usuario no encontrado." });

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

// ── Opcional: adjunta usuario si hay token, no falla si no ─
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token   = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role, avatar_url")
        .eq("id", decoded.id)
        .maybeSingle();
      req.user = data ?? null;
    }
  } catch {
    req.user = null;
  }
  next();
};
