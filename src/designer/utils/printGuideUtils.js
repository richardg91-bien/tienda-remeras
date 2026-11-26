import {
  centimetersToMillimeters,
  getSurfacePhysicalDimensions,
  millimetersToCanvasPixels,
} from "./surfaceUtils.js";

export const PRINT_GUIDE_TOLERANCE_CM = 2;

// Medidas de referencia infantil: no son medidas de estampado ni se dibujan.
export const CHILD_BODY_SIZE_REFERENCES = [
  { id: "newborn", label: "Recién nacido (0–1 año)", widthRangeCm: [8, 10], heightRangeCm: [8, 10] },
  { id: "age-1-3", label: "1–3 años", widthRangeCm: [14, 16], heightRangeCm: [17, 19] },
  { id: "age-4-6", label: "4–6 años", widthRangeCm: [17, 19], heightRangeCm: [19, 21] },
  { id: "age-7-11", label: "7–11 años", widthRangeCm: [18, 20], heightRangeCm: [24, 26] },
  { id: "age-12-16", label: "12–16 años", widthRangeCm: [20, 22], heightRangeCm: [29, 31] },
];

// Tamaños orientativos de estampado, independientes de la tabla corporal.
export const CHILD_RECOMMENDED_PRINT_SIZES = [
  { id: "age-1-3", label: "1–3 años", widthCm: 15, heightCm: 18 },
  { id: "age-4-6", label: "4–6 años", widthCm: 18, heightCm: 20 },
  { id: "age-7-11", label: "7–11 años", widthCm: 19, heightCm: 25 },
  { id: "age-12-16", label: "12–16 años", widthCm: 21, heightCm: 30 },
  { id: "chest-logo", label: "Logo de pecho", widthCm: 8, heightCm: 8 },
];

export const CAP_PRINT_ZONES = [
  { id: "cap-standard", label: "Frontal estándar", widthCm: 10, heightCm: 5 },
  { id: "cap-large", label: "Frontal grande", widthCm: 12, heightCm: 6 },
  { id: "cap-centered-logo", label: "Logo centrado", widthCm: 6, heightCm: 4 },
  { id: "cap-square-logo", label: "Logo cuadrado", widthCm: 5, heightCm: 5 },
];

const infantAgeRanges = CHILD_BODY_SIZE_REFERENCES.map((reference) => ({
  id: reference.id,
  label: reference.label,
  widthCm: reference.widthRangeCm,
  heightCm: reference.heightRangeCm,
}));

const infantRecommendedPrints = CHILD_RECOMMENDED_PRINT_SIZES
  .filter((size) => size.id !== "chest-logo")
  .map((size) => ({ ...size, ageLabel: size.label }));

export const PRINT_GUIDE_PROFILES = {
  shirt: {
    label: "Camiseta",
    zones: [
      { id: "front-full", label: "Frente completo", widthCm: 30, heightCm: 35, surface: "front", placement: null, adjustmentRangeCm: 2 },
      { id: "front-medium", label: "Frente medio", widthCm: 23, heightCm: 23, surface: "front", placement: null, adjustmentRangeCm: 2 },
      { id: "vertical", label: "Vertical", widthCm: 12, heightCm: 35, surface: "front", placement: null, adjustmentRangeCm: 2 },
      { id: "horizontal", label: "Horizontal", widthCm: 27, heightCm: 7, surface: "front", placement: null, adjustmentRangeCm: 2 },
    ],
  },
  hoodie: {
    label: "Hoodie / buzo",
    zones: [
      {
        id: "hoodie-front",
        label: "Frente",
        widthCm: 29,
        heightCm: 31,
        referenceRange: "28–30 × 30–32 cm",
        surface: "front",
        placement: null,
        adjustmentRangeCm: 2,
      },
      {
        id: "hoodie-back",
        label: "Espalda",
        widthCm: 33.5,
        heightCm: 37.5,
        referenceRange: "32–35 × 35–40 cm",
        surface: "back",
        placement: null,
        adjustmentRangeCm: 2,
      },
      { id: "hoodie-pocket", label: "Bolsillo", widthCm: 28, heightCm: 12, surface: "front", placement: null, adjustmentRangeCm: 2 },
      { id: "hoodie-chest-logo", label: "Logo de pecho", widthCm: 10, heightCm: 10, surface: "front", placement: null, adjustmentRangeCm: 2 },
      { id: "hoodie-sleeve-logo", label: "Logo de manga", widthCm: 8, heightCm: 25, surface: "sleeve", placement: null, adjustmentRangeCm: 2 },
    ],
  },
  infantAgeRanges: {
    label: "Camiseta infantil: ancho y alto por edad",
    ranges: infantAgeRanges,
  },
  infantRecommendedPrints: {
    label: "Camiseta infantil: estampados recomendados",
    ranges: infantRecommendedPrints,
  },
  children: {
    label: "Infantil",
    zones: CHILD_RECOMMENDED_PRINT_SIZES.map((size) => ({
      ...size,
      surface: "front",
      placement: null,
      adjustmentRangeCm: null,
    })),
  },
  cap: {
    label: "Gorra",
    zones: CAP_PRINT_ZONES.map((zone) => ({
      ...zone,
      surface: "front",
      placement: null,
      adjustmentRangeCm: null,
    })),
  },
};

function getSurfaceRole(surface) {
  const value = `${surface?.id || ""} ${surface?.label || ""}`.toLowerCase();
  if (/back|espalda|posterior/.test(value)) return "back";
  if (/sleeve|manga/.test(value)) return "sleeve";
  if (/pocket|bolsillo/.test(value)) return "pocket";
  if (/front|frente|pecho|panel frontal|front panel/.test(value)) return "front";
  return null;
}

export function getPrintGuideFamily(model) {
  const value = `${model?.id || ""} ${model?.name || ""} ${model?.category || ""}`.toLowerCase();
  if (/hoodie|hood|buzo|sudadera|sweatshirt|canguro/.test(value)) return "hoodie";
  if (/gorra|cap|hat/.test(value)) return "cap";
  if (/infantil|infant|children|kids/.test(value)) return "infant-shirt";
  if (model?.id === "tee-classic" || /remera|camiseta|t-shirt|tee|shirt/.test(value)) return "shirt";
  return model?.category === "textil" ? "shirt" : null;
}

export function getDefaultPrintGuideProduct(model) {
  const family = getPrintGuideFamily(model);
  if (family === "hoodie") return "hoodie";
  if (family === "cap") return "cap";
  if (family === "infant-shirt") return "infant-shirt";
  return "adult-shirt";
}

export function getInfantAgeOptions(childTable = "age-dimensions") {
  const source = childTable === "recommended-prints"
    ? PRINT_GUIDE_PROFILES.infantRecommendedPrints.ranges
    : PRINT_GUIDE_PROFILES.infantAgeRanges.ranges;
  return source.map(({ id, label }) => ({ id, label }));
}

export function getPrintGuidesForSurface(model, surface, options = {}) {
  const family = getPrintGuideFamily(model);
  const role = getSurfaceRole(surface);
  if (!family || !role || !getSurfacePhysicalDimensions(surface)) return [];

  if (family === "hoodie") return getPrintGuidesForSelection("hoodie", surface);
  if (family === "shirt") return PRINT_GUIDE_PROFILES.shirt.zones.filter((zone) => zone.surface === role);
  if (family === "cap") return PRINT_GUIDE_PROFILES.cap.zones.filter((zone) => zone.surface === role);
  if (family === "infant-shirt") {
    if (options.childTable !== "recommended-prints") return [];
    return getPrintGuidesForSelection("infant-shirt", surface, {
      childTable: options.childTable,
      ageId: options.ageId || PRINT_GUIDE_PROFILES.infantAgeRanges.ranges[0].id,
    });
  }
  return [];
}

export function getPrintGuideProductOptions(model) {
  const options = [
    { id: "adult-shirt", label: "Camiseta adulta" },
    { id: "infant-shirt", label: "Camiseta infantil" },
    { id: "cap", label: "Gorra" },
  ];
  if (getPrintGuideFamily(model) === "hoodie") {
    options.push({ id: "hoodie", label: "Hoodie / buzo" });
  }
  return options;
}

export function getPrintGuidesForSelection(productType, surface, options = {}) {
  const role = getSurfaceRole(surface);
  if (!role || (productType !== "hoodie" && role !== "front")) return [];

  if (productType === "adult-shirt") {
    return PRINT_GUIDE_PROFILES.shirt.zones.filter((zone) => zone.surface === role);
  }
  if (productType === "hoodie") {
    return PRINT_GUIDE_PROFILES.hoodie.zones.filter((zone) =>
      zone.surface === role || (role === "pocket" && zone.id === "hoodie-pocket"),
    );
  }
  if (productType === "cap") {
    return PRINT_GUIDE_PROFILES.cap.zones.filter((zone) => zone.surface === role);
  }
  if (productType !== "infant-shirt") return [];

  if (options.childTable === "recommended-prints") {
    const age = PRINT_GUIDE_PROFILES.infantRecommendedPrints.ranges.find(
      (range) => range.id === options.ageId,
    ) || PRINT_GUIDE_PROFILES.infantRecommendedPrints.ranges[0];
    return [
      {
        id: `infant-print-${age.id}`,
        label: "Estampado recomendado",
        widthCm: age.widthCm,
        heightCm: age.heightCm,
        ageLabel: age.ageLabel,
        recommendedRange: `${age.widthCm} × ${age.heightCm} cm`,
        surface: "front",
        placement: null,
        adjustmentRangeCm: null,
      },
      {
        id: "infant-chest-logo",
        label: "Logo de pecho",
        widthCm: 8,
        heightCm: 8,
        ageLabel: age.ageLabel,
        recommendedRange: "8 × 8 cm",
        surface: "front",
        placement: null,
        adjustmentRangeCm: null,
      },
    ];
  }

  const age = PRINT_GUIDE_PROFILES.infantAgeRanges.ranges.find(
    (range) => range.id === options.ageId,
  ) || PRINT_GUIDE_PROFILES.infantAgeRanges.ranges[0];
  const midpoint = ([min, max]) => Math.round(((min + max) / 2) * 10) / 10;
  return [{
    id: `infant-dimensions-${age.id}`,
    label: "Área frontal: ancho y alto por edad",
    widthCm: midpoint(age.widthCm),
    heightCm: midpoint(age.heightCm),
    ageLabel: age.label,
    referenceRange: `${age.widthCm[0]}–${age.widthCm[1]} × ${age.heightCm[0]}–${age.heightCm[1]} cm`,
    surface: "front",
    placement: null,
    adjustmentRangeCm: null,
  }];
}

export function getPrintGuideDimensionBounds(guide, axis) {
  const value = Number(guide?.[axis === "width" ? "widthCm" : "heightCm"]);
  if (guide?.adjustmentRangeCm === null) return { min: 0.1, max: undefined };
  const adjustmentRange = guide?.adjustmentRangeCm === undefined
    ? PRINT_GUIDE_TOLERANCE_CM
    : Number(guide.adjustmentRangeCm);
  if (!Number.isFinite(adjustmentRange)) return { min: 0.1, max: undefined };
  return { min: Math.max(0.1, value - adjustmentRange), max: value + adjustmentRange };
}

export function clampPrintGuideDimension(value, guide, axis) {
  const bounds = getPrintGuideDimensionBounds(guide, axis);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number(guide[axis === "width" ? "widthCm" : "heightCm"]);
  if (guide.adjustmentRangeCm === null) return Math.round(Math.max(bounds.min, parsed) * 10) / 10;
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, parsed)) * 10) / 10;
}

export function getPrintGuideRect(guide, dimensions, surface, canvasSize) {
  const physical = getSurfacePhysicalDimensions(surface);
  if (!physical || !canvasSize?.width || !canvasSize?.height) return null;
  const widthMm = centimetersToMillimeters(dimensions.widthCm);
  const heightMm = centimetersToMillimeters(dimensions.heightCm);
  const width = millimetersToCanvasPixels(widthMm, physical.widthMm, canvasSize.width);
  const height = millimetersToCanvasPixels(heightMm, physical.heightMm, canvasSize.height);
  const placement = guide.placement || { x: 0.5, y: 0.5 };
  const centerX = canvasSize.width * placement.x;
  const centerY = canvasSize.height * placement.y;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    exceedsSurface: widthMm > physical.widthMm || heightMm > physical.heightMm,
  };
}
