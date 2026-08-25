import { useCallback, useEffect, useState } from "react";
import { canvasSyncManager } from "../utils/canvasSyncManager.js";

export const useCanvasTextureSync = ({ frontCanvas, backCanvas, selectedView = "front" }) => {
  const [designTextureFront, setDesignTextureFront] = useState(null);
  const [designTextureBack,  setDesignTextureBack]  = useState(null);

  useEffect(() => {
    const criticalEvents = ["object:modified", "object:added", "object:removed"];

    const updateFront = canvasSyncManager.debounce(async () => {
      if (!frontCanvas) return;
      const texture = await canvasSyncManager.getCanvasTexture(frontCanvas);
      if (texture) setDesignTextureFront(texture);
    }, 100);

    const updateBack = canvasSyncManager.debounce(async () => {
      if (!backCanvas) return;
      const texture = await canvasSyncManager.getCanvasTexture(backCanvas);
      if (texture) setDesignTextureBack(texture);
    }, 100);

    if (frontCanvas) criticalEvents.forEach((e) => frontCanvas.on(e, updateFront));
    if (backCanvas)  criticalEvents.forEach((e) => backCanvas.on(e, updateBack));

    return () => {
      if (frontCanvas) criticalEvents.forEach((e) => frontCanvas.off(e, updateFront));
      if (backCanvas)  criticalEvents.forEach((e) => backCanvas.off(e, updateBack));
    };
  }, [frontCanvas, backCanvas, selectedView]);

  const manualTriggerSync = useCallback(async (view = "front") => {
    const canvas = view === "front" ? frontCanvas : backCanvas;
    const setter = view === "front" ? setDesignTextureFront : setDesignTextureBack;
    if (!canvas) return;
    const texture = await canvasSyncManager.getCanvasTexture(canvas);
    if (texture) setter(texture);
  }, [frontCanvas, backCanvas]);

  return { designTextureFront, designTextureBack, manualTriggerSync };
};
