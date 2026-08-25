const STORAGE_KEYS = {
  FRONT_CANVAS: "neon-stitch-designer-front",
  BACK_CANVAS:  "neon-stitch-designer-back",
};

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
