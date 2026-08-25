import canvasStorageManager from "./canvasStorageManager.js";

export const canvasSyncManager = {
  // Convierte el canvas de Fabric.js en una URL de datos (textura para Three.js)
  getCanvasTexture: (canvas) =>
    new Promise((resolve) => {
      if (!canvas) return resolve(null);
      try {
        const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    }),

  // Obtiene la textura desde localStorage (para la vista inactiva)
  getCanvasTextureFromStorage: async (view) => {
    const objects = canvasStorageManager.loadCanvasObjects(view);
    if (!objects || objects.length === 0) return null;
    // Devuelve null — la textura de la vista inactiva se mantiene del último sync
    return null;
  },

  // Debounce para no sincronizar en cada keystroke
  debounce: (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },
};
