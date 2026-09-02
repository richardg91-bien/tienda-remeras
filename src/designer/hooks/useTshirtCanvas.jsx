import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as fabric from "fabric";
import { CANVAS_CONFIG } from "../constants/designConstants.js";
import { useCanvas } from "./useCanvas.jsx";
import canvasStorageManager from "../utils/canvasStorageManager.js";

export const useTshirtCanvas = ({ view }) => {
  const canvasRef  = useRef(null);
  const fabricRef  = useRef(null);
  const tshirtColor = useSelector((state) => state.designer.tshirtColor);
  const { setFrontCanvas, setBackCanvas, setSelectedObject } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width:           CANVAS_CONFIG.width,
      height:          CANVAS_CONFIG.height,
      backgroundColor: CANVAS_CONFIG.backgroundColor,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Registra en el contexto
    if (view === "front") setFrontCanvas(canvas);
    else                  setBackCanvas(canvas);

    // Carga objetos guardados en localStorage
    const saved = canvasStorageManager.loadCanvasObjects(view);
    if (saved.length > 0) {
      canvas.loadFromJSON({ objects: saved }).then(() => canvas.renderAll());
    }

    // Selección de objetos
    canvas.on("selection:created",  (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on("selection:updated",  (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on("selection:cleared",  ()  => setSelectedObject(null));

    // Guarda en localStorage al modificar
    canvas.on("object:modified", () => canvasStorageManager.saveCanvasObjects(view, canvas));
    canvas.on("object:added",    () => canvasStorageManager.saveCanvasObjects(view, canvas));
    canvas.on("object:removed",  () => canvasStorageManager.saveCanvasObjects(view, canvas));

    return () => {
      canvas.dispose();
      if (view === "front") setFrontCanvas(null);
      else                  setBackCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return { canvasRef, tshirtColor };
};
