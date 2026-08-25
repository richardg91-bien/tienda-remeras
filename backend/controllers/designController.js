import { validationResult } from "express-validator";
import Design from "../models/Design.js";
import User   from "../models/User.js";
import { cloudinary, uploadDesign } from "../config/cloudinary.js";

// ── POST /api/designs ─────────────────────────────────────────────────────────
// Sube una imagen de diseño a Cloudinary y guarda en DB
export const createDesign = [
  // Middleware multer inline para manejar el error en el mismo request
  (req, res, next) => uploadDesign.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Se requiere una imagen." });
      }

      const { title, description, tags, category, isPublic } = req.body;

      const design = await Design.create({
        owner: req.user._id,
        image: {
          url:      req.file.path,
          publicId: req.file.filename,
          format:   req.file.format,
          bytes:    req.file.size,
          width:    req.file.width,
          height:   req.file.height,
        },
        title:       title || "Sin título",
        description: description || "",
        tags:        tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [],
        category:    category || "otro",
        isPublic:    isPublic === "true" || isPublic === true,
      });

      // Agrega referencia al usuario
      await User.findByIdAndUpdate(req.user._id, {
        $push: { designs: design._id },
      });

      return res.status(201).json({
        message: "Diseño subido exitosamente.",
        design,
      });
    } catch (error) {
      console.error("createDesign error:", error);
      return res.status(500).json({ message: "Error subiendo diseño." });
    }
  },
];

// ── GET /api/designs ──────────────────────────────────────────────────────────
// Galería pública: diseños aprobados y públicos de todos los usuarios
export const getPublicDesigns = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)     || 1);
    const limit    = Math.min(50, parseInt(req.query.limit)   || 12);
    const category = req.query.category || null;
    const tags     = req.query.tags     ? req.query.tags.split(",") : null;
    const skip     = (page - 1) * limit;

    const filter = { isPublic: true, status: "approved" };
    if (category) filter.category = category;
    if (tags)     filter.tags = { $in: tags };

    const [designs, total] = await Promise.all([
      Design.find(filter)
        .populate("owner", "firstName lastName avatar.url")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Design.countDocuments(filter),
    ]);

    return res.json({
      designs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("getPublicDesigns error:", error);
    return res.status(500).json({ message: "Error obteniendo diseños." });
  }
};

// ── GET /api/designs/mine ─────────────────────────────────────────────────────
// Diseños del usuario autenticado (todos los estados)
export const getMyDesigns = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip  = (page - 1) * limit;

    const [designs, total] = await Promise.all([
      Design.find({ owner: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Design.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({
      designs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("getMyDesigns error:", error);
    return res.status(500).json({ message: "Error obteniendo tus diseños." });
  }
};

// ── GET /api/designs/:id ──────────────────────────────────────────────────────
export const getDesignById = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id)
      .populate("owner", "firstName lastName avatar.url");

    if (!design) {
      return res.status(404).json({ message: "Diseño no encontrado." });
    }

    // Solo públicos/aprobados, o el dueño
    const isOwner = req.user && design.owner._id.toString() === req.user._id.toString();
    if (!design.isPublic && !isOwner) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    // Incrementa views
    await Design.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    return res.json({ design });
  } catch (error) {
    console.error("getDesignById error:", error);
    return res.status(500).json({ message: "Error obteniendo diseño." });
  }
};

// ── PUT /api/designs/:id ──────────────────────────────────────────────────────
export const updateDesign = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });

    if (design.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No podés editar este diseño." });
    }

    const { title, description, tags, category, isPublic } = req.body;
    if (title       !== undefined) design.title       = title;
    if (description !== undefined) design.description = description;
    if (category    !== undefined) design.category    = category;
    if (isPublic    !== undefined) design.isPublic    = isPublic;
    if (tags        !== undefined) {
      design.tags = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim());
    }

    await design.save();
    return res.json({ message: "Diseño actualizado.", design });
  } catch (error) {
    console.error("updateDesign error:", error);
    return res.status(500).json({ message: "Error actualizando diseño." });
  }
};

// ── DELETE /api/designs/:id ───────────────────────────────────────────────────
export const deleteDesign = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });

    const isOwner = design.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No podés eliminar este diseño." });
    }

    // Elimina de Cloudinary
    if (design.image?.publicId) {
      await cloudinary.uploader.destroy(design.image.publicId);
    }

    await Design.findByIdAndDelete(req.params.id);

    // Quita referencia del usuario
    await User.findByIdAndUpdate(design.owner, {
      $pull: { designs: design._id },
    });

    return res.json({ message: "Diseño eliminado." });
  } catch (error) {
    console.error("deleteDesign error:", error);
    return res.status(500).json({ message: "Error eliminando diseño." });
  }
};

// ── POST /api/designs/:id/like ────────────────────────────────────────────────
export const likeDesign = async (req, res) => {
  try {
    const design = await Design.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!design) return res.status(404).json({ message: "Diseño no encontrado." });
    return res.json({ likes: design.likes });
  } catch (error) {
    return res.status(500).json({ message: "Error." });
  }
};
