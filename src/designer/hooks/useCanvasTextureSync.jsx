import { useCallback, useEffect, useRef, useState } from "react";
import { canvasSyncManager } from "../utils/canvasSyncManager.js";

export const useCanvasTextureSync = ({ frontCanvas, backCanvas, selectedView = "front" }) => {
  const [designTextureFront, setDesignTextureFront] = useState(null);
  const [designTextureBack,  setDesignTextureBack]  = useState(null);

  // Refs para las funciones debounced — se recrean cuando cambian los canvas
  const updateFrontRef = useRef(null);
  const updateBackRef  = useRef(null);

  // Función que fuerza sincronización inmediata
  const syncNow = useCallback(async (canvas, setter) => {
    if (!canvas) return;
    const texture = await canvasSyncManager.getCanvasTexture(canvas);
    if (texture) setter(texture);
  }, []);

  // ── Escucha eventos del frontCanvas ──────────────────
  useEffect(() => {
    if (!frontCanvas) return;

    // Sincroniza inmediatamente al montar
    syncNow(frontCanvas, setDesignTextureFront);

    const update = canvasSyncManager.debounce(async () => {
      await syncNow(frontCanvas, setDesignTextureFront);
    }, 80);

    updateFrontRef.current = update;

    const events = ["object:modified", "object:added", "object:removed", "object:moving", "object:scaling", "object:rotating", "text:changed"];
    events.forEach(e => frontCanvas.on(e, update));

    return () => {
      events.forEach(e => frontCanvas.off(e, update));
    };
  }, [frontCanvas, syncNow]);

  // ── Escucha eventos del backCanvas ───────────────────
  useEffect(() => {
    if (!backCanvas) return;

    syncNow(backCanvas, setDesignTextureBack);

    const update = canvasSyncManager.debounce(async () => {
      await syncNow(backCanvas, setDesignTextureBack);
    }, 80);

    updateBackRef.current = update;

    const events = ["object:modified", "object:added", "object:removed", "object:moving", "object:scaling", "object:rotating", "text:changed"];
    events.forEach(e => backCanvas.on(e, update));

    return () => {
      events.forEach(e => backCanvas.off(e, update));
    };
  }, [backCanvas, syncNow]);

  // ── Trigger manual (llamado desde DesignTools) ───────
  const manualTriggerSync = useCallback(async (view = "front") => {
    if (view === "front") {
      await syncNow(frontCanvas, setDesignTextureFront);
    } else {
      await syncNow(backCanvas, setDesignTextureBack);
    }
  }, [frontCanvas, backCanvas, syncNow]);

  return { designTextureFront, designTextureBack, manualTriggerSync };
};
