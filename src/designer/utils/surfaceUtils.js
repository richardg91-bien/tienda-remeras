import { CANVAS_CONFIG } from "../constants/designConstants.js";

export function getProductSurfaces(model) {
  if (Array.isArray(model?.print_surfaces)) {
    return model.print_surfaces.filter((surface) =>
      typeof surface?.id === "string" &&
      surface.id.trim().length > 0 &&
      Boolean(getSurfacePhysicalDimensions(surface)),
    );
  }
  if (model?.id === "tee-classic") {
    return [
      { id: "front", label: "Frente", widthMm: 300, heightMm: 400 },
      { id: "back", label: "Espalda", widthMm: 300, heightMm: 400 },
    ];
  }
  return [];
}

export function getSurfaceCanvasSize(surface, productRef) {
  if (productRef === "tee-classic" && ["front", "back"].includes(surface?.id)) {
    return CANVAS_CONFIG;
  }

  const widthMm = Number(surface?.widthMm || surface?.diameterMm || 300);
  const heightMm = Number(surface?.heightMm || surface?.diameterMm || 300);
  const scale = Math.min(CANVAS_CONFIG.width / widthMm, CANVAS_CONFIG.height / heightMm);

  return {
    width: Math.max(1, Math.round(widthMm * scale)),
    height: Math.max(1, Math.round(heightMm * scale)),
  };
}

export function getSurfacePhysicalDimensions(surface) {
  const diameterMm = Number(surface?.diameterMm);
  const widthMm = Number(surface?.widthMm) || diameterMm;
  const heightMm = Number(surface?.heightMm) || diameterMm;
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) return null;
  return { widthMm, heightMm };
}

export function centimetersToMillimeters(centimeters) {
  return Number(centimeters) * 10;
}

export function millimetersToCentimeters(millimeters) {
  return Number(millimeters) / 10;
}

export function millimetersToCanvasPixels(millimeters, surfaceMillimeters, canvasPixels) {
  if (!Number.isFinite(millimeters) || surfaceMillimeters <= 0 || canvasPixels <= 0) return 0;
  return millimeters * canvasPixels / surfaceMillimeters;
}

export function adaptCanvasToSurface(canvasJson, sourceSize, targetSize) {
  const json = JSON.parse(JSON.stringify(canvasJson || { objects: [] }));
  const sourceWidth = Number(sourceSize?.width) || targetSize.width;
  const sourceHeight = Number(sourceSize?.height) || targetSize.height;
  const scale = Math.min(targetSize.width / sourceWidth, targetSize.height / sourceHeight);
  const offsetX = (targetSize.width - sourceWidth * scale) / 2;
  const offsetY = (targetSize.height - sourceHeight * scale) / 2;

  for (const object of json.objects || []) {
    object.left = (Number(object.left) || 0) * scale + offsetX;
    object.top = (Number(object.top) || 0) * scale + offsetY;
    object.scaleX = (Number(object.scaleX) || 1) * scale;
    object.scaleY = (Number(object.scaleY) || 1) * scale;
  }
  return json;
}

export function getProductionSize(model, surface) {
  const dpi = Number(model?.production_template?.resolutionDpi) || 300;
  const format = model?.production_template?.format || "PNG";
  const colorMode = model?.production_template?.colorMode || "sRGB";
  const widthMm = Number(surface?.widthMm || surface?.diameterMm || 0);
  const heightMm = Number(surface?.heightMm || surface?.diameterMm || 0);
  if (!widthMm || !heightMm) return null;

  return {
    dpi,
    format,
    colorMode,
    widthPx: Math.round(widthMm / 25.4 * dpi),
    heightPx: Math.round(heightMm / 25.4 * dpi),
    width: Math.round(widthMm / 25.4 * dpi),
    height: Math.round(heightMm / 25.4 * dpi),
  };
}
