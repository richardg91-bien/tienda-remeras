const STORAGE_KEYS = {
  FRONT_CANVAS: "neon-stitch-designer-front",
  BACK_CANVAS:  "neon-stitch-designer-back",
};

const getProductSurfaceKey = (productRef, surfaceId) =>
  `neon-stitch-designer:${encodeURIComponent(productRef)}:${encodeURIComponent(surfaceId)}`;

const canvasStorageManager = {
  saveCanvasObjects: (view, canvas) => {
    if (!canvas) return;
    try {
      const key     = view === "front" ? STORAGE_KEYS.FRONT_CANVAS : STORAGE_KEYS.BACK_CANVAS;
      const objects = canvas.getObjects().map((obj) => obj.toJSON());
      localStorage.setItem(key, JSON.stringify(objects));
    } catch (error) {
      console.error("Error saving canvas:", error);
    }
  },

  loadCanvasObjects: (view) => {
    try {
      const key  = view === "front" ? STORAGE_KEYS.FRONT_CANVAS : STORAGE_KEYS.BACK_CANVAS;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveProductCanvasObjects: (productRef, surfaceId, objects) => {
    try {
      localStorage.setItem(getProductSurfaceKey(productRef, surfaceId), JSON.stringify(objects));
    } catch (error) {
      console.error("Error saving product surface:", error);
    }
  },

  clearProductCanvasObjects: (productRef, surfaceId) => {
    localStorage.removeItem(getProductSurfaceKey(productRef, surfaceId));
  },

  loadProductCanvasObjects: (productRef, surfaceId) => {
    try {
      const key = getProductSurfaceKey(productRef, surfaceId);
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
      if (productRef === "tee-classic" && ["front", "back"].includes(surfaceId)) {
        const legacyKey = surfaceId === "front" ? STORAGE_KEYS.FRONT_CANVAS : STORAGE_KEYS.BACK_CANVAS;
        const legacyData = localStorage.getItem(legacyKey);
        return legacyData ? JSON.parse(legacyData) : null;
      }
      return null;
    } catch (error) {
      console.error("Error loading product surface:", error);
      return null;
    }
  },

  clearCanvasStorage: (view) => {
    if (view === "all") {
      localStorage.removeItem(STORAGE_KEYS.FRONT_CANVAS);
      localStorage.removeItem(STORAGE_KEYS.BACK_CANVAS);
    } else {
      const key = view === "front" ? STORAGE_KEYS.FRONT_CANVAS : STORAGE_KEYS.BACK_CANVAS;
      localStorage.removeItem(key);
    }
  },
};

export default canvasStorageManager;
