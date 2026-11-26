export const lazyProtect = async (req, res, next) => {
  try {
    const { protect } = await import("../middleware/auth.js");
    return protect(req, res, next);
  } catch (error) {
    return next(error);
  }
};

export const lazyOptionalAuth = async (req, res, next) => {
  try {
    const { optionalAuth } = await import("../middleware/auth.js");
    return optionalAuth(req, res, next);
  } catch (error) {
    return next(error);
  }
};
