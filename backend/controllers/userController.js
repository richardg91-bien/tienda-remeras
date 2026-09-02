import bcrypt    from "bcryptjs";
import { validationResult } from "express-validator";
import supabase  from "../config/supabase.js";
import { cloudinary, uploadAvatar, uploadToCloudinary } from "../config/cloudinary.js";

const _sanitize = (user) => {
  const { password_hash: _ph, refresh_token: _rt, ...safe } = user;
  return safe;
};

// ── GET /api/users/profile ────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, phone, bio, avatar_url, address, role, is_verified, created_at")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;
    return res.json({ user });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Error obteniendo perfil." });
  }
};

// ── PUT /api/users/profile ────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const allowed = ["first_name", "last_name", "phone", "bio"]; // eslint-disable-line no-unused-vars
    const updates = {};

    // Mapea camelCase del body a snake_case de la DB
    if (req.body.firstName !== undefined) updates.first_name = req.body.firstName;
    if (req.body.lastName  !== undefined) updates.last_name  = req.body.lastName;
    if (req.body.phone     !== undefined) updates.phone      = req.body.phone;
    if (req.body.bio       !== undefined) updates.bio        = req.body.bio;

    if (req.body.address !== undefined) {
      // Merge la dirección existente con la nueva
      const { data: current } = await supabase
        .from("users").select("address").eq("id", req.user.id).single();
      updates.address = { ...(current?.address ?? {}), ...req.body.address };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar." });
    }

    const { data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", req.user.id)
      .select("id, first_name, last_name, email, phone, bio, avatar_url, address, role, created_at")
      .single();

    if (error) throw error;
    return res.json({ message: "Perfil actualizado.", user });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Error actualizando perfil." });
  }
};

// ── PUT /api/users/change-password ────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { currentPassword, newPassword } = req.body;

    // Necesitamos el hash actual
    const { data: user } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", req.user.id)
      .single();

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ message: "Contraseña actual incorrecta." });

    const password_hash = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("id", req.user.id);

    if (error) throw error;
    return res.json({ message: "Contraseña actualizada exitosamente." });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ message: "Error cambiando contraseña." });
  }
};

// ── POST /api/users/avatar ────────────────────────────────────────────────────
export const uploadUserAvatar = [
  // Paso 1: multer intercepta el archivo en memoria
  (req, res, next) => uploadAvatar.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  // Paso 2: sube a Cloudinary y actualiza la DB
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No se recibió ninguna imagen." });

      // Elimina avatar anterior si existe
      const { data: current } = await supabase
        .from("users").select("avatar_url, avatar_public_id").eq("id", req.user.id).single();

      if (current?.avatar_public_id) {
        await cloudinary.uploader.destroy(current.avatar_public_id);
      }

      // Sube el nuevo avatar
      const result = await uploadToCloudinary(req.file.buffer, {
        folder:         "neon-stitch/avatars",
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }],
      });

      const { error } = await supabase
        .from("users")
        .update({ avatar_url: result.url, avatar_public_id: result.publicId })
        .eq("id", req.user.id);

      if (error) throw error;

      return res.json({ message: "Avatar actualizado.", avatar_url: result.url });
    } catch (error) {
      console.error("uploadUserAvatar error:", error);
      return res.status(500).json({ message: "Error subiendo avatar." });
    }
  },
];

// ── DELETE /api/users/avatar ──────────────────────────────────────────────────
export const deleteAvatar = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from("users").select("avatar_public_id").eq("id", req.user.id).single();

    if (user?.avatar_public_id) {
      await cloudinary.uploader.destroy(user.avatar_public_id);
    }

    await supabase
      .from("users")
      .update({ avatar_url: "", avatar_public_id: "" })
      .eq("id", req.user.id);

    return res.json({ message: "Avatar eliminado." });
  } catch (error) {
    console.error("deleteAvatar error:", error);
    return res.status(500).json({ message: "Error eliminando avatar." });
  }
};

// ── GET /api/users/orders ─────────────────────────────────────────────────────
export const getMyOrders = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data: orders, count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return res.json({
      orders,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("getMyOrders error:", error);
    return res.status(500).json({ message: "Error obteniendo órdenes." });
  }
};

// ── DELETE /api/users/account ─────────────────────────────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const { data: user } = await supabase
      .from("users").select("password_hash, avatar_public_id").eq("id", req.user.id).single();

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: "Contraseña incorrecta." });

    if (user.avatar_public_id) {
      await cloudinary.uploader.destroy(user.avatar_public_id);
    }

    await supabase.from("users").delete().eq("id", req.user.id);

    res.clearCookie("refreshToken");
    return res.json({ message: "Cuenta eliminada." });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({ message: "Error eliminando cuenta." });
  }
};
