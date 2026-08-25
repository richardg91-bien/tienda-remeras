import { validationResult } from "express-validator";
import User   from "../models/User.js";
import Order  from "../models/Order.js";
import Design from "../models/Design.js";
import { cloudinary, uploadAvatar } from "../config/cloudinary.js";

// ── GET /api/users/profile ────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("orders", "status total createdAt")
      .populate("designs", "title image.url isPublic createdAt");

    return res.json({ user: user.toPublic() });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Error obteniendo perfil." });
  }
};

// ── PUT /api/users/profile ────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const allowed = ["firstName", "lastName", "phone", "bio", "address"];
    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.json({
      message: "Perfil actualizado.",
      user: user.toPublic(),
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Error actualizando perfil." });
  }
};

// ── PUT /api/users/change-password ────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ message: "Contraseña actual incorrecta." });
    }

    user.password = newPassword; // el pre-save hook la hashea
    await user.save();

    return res.json({ message: "Contraseña actualizada exitosamente." });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ message: "Error cambiando contraseña." });
  }
};

// ── POST /api/users/avatar ────────────────────────────────────────────────────
export const uploadUserAvatar = [
  // Middleware multer inline
  (req, res, next) => uploadAvatar.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se recibió ninguna imagen." });
      }

      // Si ya tenía avatar, elimina el anterior de Cloudinary
      const user = await User.findById(req.user._id);
      if (user.avatar?.publicId) {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      }

      user.avatar = {
        url:      req.file.path,
        publicId: req.file.filename,
      };
      await user.save({ validateBeforeSave: false });

      return res.json({
        message: "Avatar actualizado.",
        avatar:  user.avatar,
      });
    } catch (error) {
      console.error("uploadAvatar error:", error);
      return res.status(500).json({ message: "Error subiendo avatar." });
    }
  },
];

// ── DELETE /api/users/avatar ──────────────────────────────────────────────────
export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.avatar?.publicId) {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    }
    user.avatar = { url: "", publicId: "" };
    await user.save({ validateBeforeSave: false });

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
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ user: req.user._id }),
    ]);

    return res.json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
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
    const user = await User.findById(req.user._id).select("+password");

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    // Elimina avatar de Cloudinary si existe
    if (user.avatar?.publicId) {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    }

    await User.findByIdAndDelete(req.user._id);

    res.clearCookie("refreshToken");
    return res.json({ message: "Cuenta eliminada." });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({ message: "Error eliminando cuenta." });
  }
};
