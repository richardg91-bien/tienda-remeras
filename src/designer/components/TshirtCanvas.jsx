import { CANVAS_CONFIG } from "../constants/designConstants.js";
import { useTshirtCanvas } from "../hooks/useTshirtCanvas.jsx";

/**
 * Canvas 2D de Fabric.js para diseñar la remera.
 * Reutilizable para frente y dorso vía prop `view`.
 */
const TshirtCanvas = ({ svgPath, view }) => {
  const { canvasRef, tshirtColor } = useTshirtCanvas({ svgPath, view });

  return (
    <div className="relative" style={{ width: CANVAS_CONFIG.width, height: CANVAS_CONFIG.height }}>
      {/* Silueta SVG de la remera (fondo) */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 810 810" className="w-full h-full">
          <path d={svgPath} fill={tshirtColor} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        </svg>
      </div>
      {/* Canvas de Fabric.js encima */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
      />
    </div>
  );
};

export default TshirtCanvas;
