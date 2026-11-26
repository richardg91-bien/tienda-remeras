import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as fabric from "fabric";
import { CANVAS_CONFIG } from "../constants/designConstants.js";
import { useCanvas } from "./useCanvas.jsx";
import canvasStorageManager from "../utils/canvasStorageManager.js";
import { hydrateProjectCanvas } from "../utils/designerApi.js";
import { adaptCanvasToSurface } from "../utils/surfaceUtils.js";

export const useTshirtCanvas = ({
  view,
  productRef = "tee-classic",
  surfaceId = view,
  width = CANVAS_CONFIG.width,
  height = CANVAS_CONFIG.height,
  initialDesign,
  onLoadError,
}) => {
  const canvasRef  = useRef(null);
  const tshirtColor = useSelector((state) => state.designer.tshirtColor);
  const { setFrontCanvas, setBackCanvas, setSelectedObject } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: CANVAS_CONFIG.backgroundColor,
      preserveObjectStacking: true,
    });

    // Registra en el contexto
    if (view === "front") setFrontCanvas(canvas);
    else                  setBackCanvas(canvas);

    let disposed = false;
    const restore = async () => {
      const saved = canvasStorageManager.loadProductCanvasObjects(productRef, surfaceId);
      let copiedSource = false;
      if (saved) {
        await canvas.loadFromJSON(await hydrateProjectCanvas({ objects: saved }));
      } else if (initialDesign?.json) {
        const adapted = adaptCanvasToSurface(
          initialDesign.json,
          { width: initialDesign.width, height: initialDesign.height },
          { width, height },
        );
        await canvas.loadFromJSON(await hydrateProjectCanvas(adapted));
        copiedSource = true;
      }
      if (disposed) return;
      canvas.renderAll();

      canvas.on("selection:created", (event) => setSelectedObject(event.selected?.[0] || null));
      canvas.on("selection:updated", (event) => setSelectedObject(event.selected?.[0] || null));
      canvas.on("selection:cleared", () => setSelectedObject(null));

      const save = () => canvasStorageManager.saveProductCanvasObjects(
        productRef,
        surfaceId,
        canvas.getObjects().map((object) => object.toObject(["assetId", "privateAssetPath"])),
      );
      ["object:modified", "object:added", "object:removed"].forEach((event) => canvas.on(event, save));
      if (copiedSource) save();
    };
    restore().catch((error) => {
      if (!disposed) onLoadError?.(error);
    });

    return () => {
      disposed = true;
      canvas.dispose();
      setSelectedObject(null);
      if (view === "front") setFrontCanvas(null);
      else                  setBackCanvas(null);
    };
  }, [view, productRef, surfaceId, width, height, initialDesign, onLoadError, setBackCanvas, setFrontCanvas, setSelectedObject]);

  return { canvasRef, tshirtColor };
};
