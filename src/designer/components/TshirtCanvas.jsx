import { useEffect, useRef, useState } from "react";
import {
  getSurfaceCanvasSize,
  getSurfacePhysicalDimensions,
  millimetersToCentimeters,
} from "../utils/surfaceUtils.js";
import {
  CHILD_BODY_SIZE_REFERENCES,
  CHILD_RECOMMENDED_PRINT_SIZES,
  clampPrintGuideDimension,
  getPrintGuideDimensionBounds,
  getInfantAgeOptions,
  getPrintGuideFamily,
  getPrintGuideRect,
  getPrintGuidesForSurface,
} from "../utils/printGuideUtils.js";
import { useTshirtCanvas } from "../hooks/useTshirtCanvas.jsx";

const TshirtCanvas = ({
  svgPath,
  view,
  model,
  surface,
  initialDesign,
  onLoadError,
}) => {
  const productRef = model?.id || "tee-classic";
  const surfaceId = surface?.id || view;
  const { width, height } = getSurfaceCanvasSize(surface, productRef);
  const { canvasRef, tshirtColor } = useTshirtCanvas({
    view,
    productRef,
    surfaceId,
    width,
    height,
    initialDesign,
    onLoadError,
  });
  const isTshirt = productRef === "tee-classic";
  const isCircular = Boolean(surface?.diameterMm);
  const frameRef = useRef(null);
  const guidePanelRef = useRef(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [referenceSize, setReferenceSize] = useState("M");
  const [childTable, setChildTable] = useState("age-dimensions");
  const [childAgeId, setChildAgeId] = useState("newborn");
  const [guideDimensions, setGuideDimensions] = useState({});
  const modelGuideFamily = getPrintGuideFamily(model);
  const ageOptions = modelGuideFamily === "infant-shirt" ? getInfantAgeOptions(childTable) : [];
  const activeAgeId = ageOptions.find((age) => age.id === childAgeId)?.id || ageOptions[0]?.id;
  const guides = modelGuideFamily === "infant-shirt" && childTable === "age-dimensions"
    ? []
    : getPrintGuidesForSurface(model, surface, { childTable, ageId: activeAgeId });
  const visibleGuides = modelGuideFamily === "infant-shirt" && childTable === "recommended-prints"
    ? guides.filter((guide) => guide.id === `infant-print-${activeAgeId}` || guide.id === "infant-chest-logo")
    : guides;
  const selectedGuide = visibleGuides.find((guide) => guide.id === selectedGuideId) || visibleGuides[0];
  const productSizes = Array.isArray(model?.variant_schema?.sizes)
    ? model.variant_schema.sizes.map((size) =>
      typeof size === "string" ? size : size?.id || size?.value || size?.label,
    ).filter(Boolean)
    : [];
  const sizeOptions = productSizes.length ? productSizes : ["M", "L"];
  const activeSize = sizeOptions.includes(referenceSize)
    ? referenceSize
    : sizeOptions.includes("M") ? "M" : sizeOptions[0];
  const activeReference = modelGuideFamily === "infant-shirt" ? activeAgeId : activeSize;
  const guideKey = selectedGuide
    ? `${productRef}:${surfaceId}:${childTable}:${activeReference}:${selectedGuide.id}`
    : "";
  const activeDimensions = selectedGuide
    ? guideDimensions[guideKey] || {
      widthCm: selectedGuide.widthCm,
      heightCm: selectedGuide.heightCm,
    }
    : null;
  const guideRects = visibleGuides.map((guide, index) => {
    const key = `${productRef}:${surfaceId}:${childTable}:${activeReference}:${guide.id}`;
    const dimensions = guideDimensions[key] || { widthCm: guide.widthCm, heightCm: guide.heightCm };
    return {
      guide,
      dimensions,
      index,
      rect: getPrintGuideRect(guide, dimensions, surface, { width, height }),
    };
  }).filter(({ rect }) => rect);
  const selectedGuideRect = guideRects.find(({ guide }) => guide.id === selectedGuide?.id)?.rect;
  const physicalDimensions = getSurfacePhysicalDimensions(surface);
  const selectedBodyRange = modelGuideFamily === "infant-shirt" && childTable === "age-dimensions"
    ? CHILD_BODY_SIZE_REFERENCES.find((entry) => entry.id === activeAgeId)
    : null;

  useEffect(() => {
    const frame = frameRef.current;
    const container = frame?.closest(".canvas-viewport") || frame?.parentElement;
    if (!container || typeof ResizeObserver === "undefined") return;

    const updateScale = () => {
      const availableWidth = container.clientWidth - 16;
      const controlsHeight = guidePanelRef.current?.getBoundingClientRect().height || 0;
      const availableHeight = container.clientHeight - controlsHeight - 28;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      setDisplayScale(Math.min(1, availableWidth / width, availableHeight / height));
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    if (guidePanelRef.current) observer.observe(guidePanelRef.current);
    updateScale();
    return () => observer.disconnect();
  }, [width, height, guides.length]);

  const updateGuideDimension = (axis, value) => {
    if (!selectedGuide || !guideKey) return;
    const field = axis === "width" ? "widthCm" : "heightCm";
    setGuideDimensions((current) => ({
      ...current,
      [guideKey]: {
        ...activeDimensions,
        [field]: clampPrintGuideDimension(value, selectedGuide, axis),
      },
    }));
  };

  const labelWidth = 112 / displayScale;
  const labelHeight = 20 / displayScale;
  const recommendation = selectedGuide?.referenceRange
    || selectedGuide?.recommendedRange
    || (selectedGuide ? `${selectedGuide.widthCm} × ${selectedGuide.heightCm} cm` : "");
  const recommendationLabel = "Estampado recomendado";

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: width * displayScale }}>
      {(guides.length > 0 || modelGuideFamily === "infant-shirt") && (
        <section
          ref={guidePanelRef}
          aria-label="Guías de impresión"
          className="w-full rounded-xl border border-[#e2e4ed] bg-white p-2 text-gray-800 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="flex min-w-0 items-center gap-2 text-[11px] font-bold">
              <input
                type="checkbox"
                checked={guidesVisible}
                onChange={(event) => setGuidesVisible(event.target.checked)}
                className="accent-[#7866c2]"
              />
              Mostrar guías
            </label>
            {modelGuideFamily === "infant-shirt" && (
              <>
                <label className="min-w-0 text-[11px] font-semibold">
                  Tabla infantil
                  <select
                    value={childTable}
                    onChange={(event) => {
                      setChildTable(event.target.value);
                      setSelectedGuideId("");
                    }}
                    className="mt-0.5 w-full rounded-md border border-[#e2e4ed] bg-white px-1.5 py-1 text-xs"
                    aria-label="Tabla de medidas infantiles"
                  >
                    <option value="age-dimensions">Ancho y alto por edad</option>
                    <option value="recommended-prints">Estampados recomendados</option>
                  </select>
                </label>
                <label className="min-w-0 text-[11px] font-semibold">
                  Talle o rango de edad
                  <select
                    value={activeAgeId || ""}
                    onChange={(event) => {
                      setChildAgeId(event.target.value);
                      setSelectedGuideId("");
                    }}
                    className="mt-0.5 w-full rounded-md border border-[#e2e4ed] bg-white px-1.5 py-1 text-xs"
                    aria-label="Talle o rango de edad"
                  >
                    {ageOptions.map((age) => <option key={age.id} value={age.id}>{age.label}</option>)}
                  </select>
                </label>
              </>
            )}
            {visibleGuides.length > 0 && <label className="min-w-0 text-[11px] font-semibold">
              Zona de estampado
              <select
                value={selectedGuide?.id || ""}
                onChange={(event) => setSelectedGuideId(event.target.value)}
                className="mt-0.5 w-full rounded-md border border-[#e2e4ed] bg-white px-1.5 py-1 text-xs"
                aria-label="Zona de estampado"
              >
                {visibleGuides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.label}
                  </option>
                ))}
              </select>
            </label>}
            {modelGuideFamily === "shirt" && (
              <label className="min-w-0 text-[11px] font-semibold">
                Talle de referencia
                <select
                  value={activeSize}
                  onChange={(event) => setReferenceSize(event.target.value)}
                  className="mt-0.5 w-full rounded-md border border-[#e2e4ed] bg-white px-1.5 py-1 text-xs"
                  aria-label="Talle de referencia de la guía"
                >
                  {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            )}
            {selectedGuide && activeDimensions && (
              <>
                {["width", "height"].map((axis) => {
                  const field = axis === "width" ? "widthCm" : "heightCm";
                  const bounds = getPrintGuideDimensionBounds(selectedGuide, axis);
                  return (
                    <label key={axis} className="min-w-0 text-[11px] font-semibold">
                      {axis === "width" ? "Ancho (cm)" : "Alto (cm)"}
                      <input
                        type="number"
                        inputMode="decimal"
                        min={bounds.min}
                        max={bounds.max}
                        step="0.1"
                        value={activeDimensions[field]}
                        onChange={(event) => updateGuideDimension(axis, event.target.value)}
                        className="mt-0.5 w-full rounded-md border border-[#e2e4ed] bg-white px-1.5 py-1 text-xs"
                        aria-label={axis === "width" ? "Ancho de la guía en centímetros" : "Alto de la guía en centímetros"}
                      />
                    </label>
                  );
                })}
              </>
            )}
          </div>
          {modelGuideFamily === "infant-shirt" && childTable === "age-dimensions" && (
            <table className="mt-2 w-full text-left text-[10px]" aria-label="Ancho y alto de referencia por edad">
              <thead><tr><th>Edad</th><th>Ancho (cm)</th><th>Alto (cm)</th></tr></thead>
              <tbody>{CHILD_BODY_SIZE_REFERENCES.map((row) => (
                <tr key={row.id}><td>{row.label}</td><td>{row.widthRangeCm[0]}–{row.widthRangeCm[1]}</td><td>{row.heightRangeCm[0]}–{row.heightRangeCm[1]}</td></tr>
              ))}</tbody>
            </table>
          )}
          {modelGuideFamily === "infant-shirt" && childTable === "recommended-prints" && (
            <table className="mt-2 w-full text-left text-[10px]" aria-label="Tamaños de estampado recomendados por edad">
              <thead><tr><th>Estampado</th><th>Ancho (cm)</th><th>Alto (cm)</th></tr></thead>
              <tbody>{CHILD_RECOMMENDED_PRINT_SIZES.map((row) => (
                <tr key={row.id}><td>{row.label}</td><td>{row.widthCm}</td><td>{row.heightCm}</td></tr>
              ))}</tbody>
            </table>
          )}
          <p className="mt-1 text-[10px] leading-tight text-gray-500">
            {selectedBodyRange && `Referencia corporal (ancho × alto): ${selectedBodyRange.widthRangeCm[0]}–${selectedBodyRange.widthRangeCm[1]} × ${selectedBodyRange.heightRangeCm[0]}–${selectedBodyRange.heightRangeCm[1]} cm. `}
            {recommendation && `${recommendationLabel}: ${recommendation}. `}
            {selectedGuide?.ageLabel && `Rango: ${selectedGuide.ageLabel}. `}
            {physicalDimensions && `Superficie: ${millimetersToCentimeters(physicalDimensions.widthMm)} × ${millimetersToCentimeters(physicalDimensions.heightMm)} cm. `}
            {selectedGuide?.adjustmentRangeCm === null
              ? "Referencia orientativa, personalizable y sin límite universal. "
              : "Referencia orientativa para M/L, ajustable ±2 cm. "}
            Ubicación visual, sin distancias verificadas a costuras.
            {modelGuideFamily === "cap" && " Solo panel frontal; no aplicar a curvas ni laterales."}
          </p>
        </section>
      )}
      <div
        ref={frameRef}
        className={`relative overflow-hidden ${isTshirt ? "" : "border border-[#e2e4ed] bg-white shadow-sm"}`}
        style={{
          width: width * displayScale,
          height: height * displayScale,
          borderRadius: isTshirt ? undefined : isCircular ? "50%" : "12px",
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width,
            height,
            transform: `scale(${displayScale})`,
            transformOrigin: "top left",
          }}
        >
          {isTshirt ? (
            <div className="pointer-events-none absolute inset-0">
              <svg viewBox="0 0 810 810" className="h-full w-full">
                <path d={svgPath} fill={tshirtColor} stroke="rgba(82,107,58,0.14)" strokeWidth="1" />
              </svg>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[#73815f]">
              <span className="text-[11px] font-semibold">{surface?.label || "Área de impresión"}</span>
              {surface?.widthMm && surface?.heightMm && (
                <span className="text-[9px]">{surface.widthMm} × {surface.heightMm} mm</span>
              )}
              {surface?.diameterMm && <span className="text-[9px]">Ø {surface.diameterMm} mm</span>}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10"
            width={width}
            height={height}
          />
          {guidesVisible && guideRects.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 z-20 h-full w-full"
              viewBox={`0 0 ${width} ${height}`}
              aria-hidden="true"
            >
              {guideRects.map(({ guide, dimensions, index, rect }) => {
                const isSelected = guide.id === selectedGuide?.id;
                const labelX = Math.max(
                  2 / displayScale,
                  Math.min(rect.x, width - labelWidth - 2 / displayScale),
                );
                const labelY = Math.min(
                  height - labelHeight - 2 / displayScale,
                  Math.max(2 / displayScale, rect.y - labelHeight - 2 / displayScale)
                    + index * (labelHeight + 2 / displayScale),
                );
                const stroke = isSelected ? "#7866c2" : "#858b99";
                return (
                  <g key={guide.id}>
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.width}
                      height={rect.height}
                      fill={isSelected ? "rgba(183,217,144,0.06)" : "transparent"}
                      stroke={stroke}
                      strokeWidth={(isSelected ? 2 : 1.5) / displayScale}
                      strokeDasharray={`${8 / displayScale} ${5 / displayScale}`}
                    />
                    <rect
                      x={labelX}
                      y={labelY}
                      width={labelWidth}
                      height={labelHeight}
                      rx={4 / displayScale}
                      fill="white"
                      stroke={stroke}
                      strokeWidth={1 / displayScale}
                    />
                    <text
                      x={labelX + 6 / displayScale}
                      y={labelY + 13 / displayScale}
                      fill="#343746"
                      fontSize={10 / displayScale}
                      fontWeight={isSelected ? "700" : "500"}
                    >
                      {`${dimensions.widthCm} × ${dimensions.heightCm} cm`}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
      {guidesVisible && selectedGuideRect?.exceedsSurface && (
        <p role="status" className="text-[10px] font-semibold text-amber-700">
          La guía supera las dimensiones físicas de esta superficie.
        </p>
      )}
    </div>
  );
};

export default TshirtCanvas;
