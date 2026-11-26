import { describe, expect, it } from "vitest";
import {
  adaptCanvasToSurface,
  getProductionSize,
  getProductSurfaces,
  getSurfaceCanvasSize,
} from "./surfaceUtils.js";

describe("surfaceUtils", () => {
  it("uses physical catalog surfaces and does not invent surfaces for other products", () => {
    const capSurface = { id: "front-panel", label: "Panel frontal", widthMm: 120, heightMm: 60 };
    expect(getProductSurfaces({ id: "cap-standard" })).toEqual([]);
    expect(getProductSurfaces({
      id: "cap-standard",
      print_surfaces: [{ id: "front-panel", label: "Panel frontal" }],
    })).toEqual([]);
    expect(getProductSurfaces({
      id: "cap-standard",
      print_surfaces: [capSurface],
    })).toEqual([capSurface]);
    expect(getProductSurfaces({ id: "tee-classic" })).toHaveLength(2);
  });

  it("fits each print surface into the editor while keeping its proportions", () => {
    expect(getSurfaceCanvasSize(
      { id: "wrap", widthMm: 200, heightMm: 90 },
      "mug-standard",
    )).toEqual({ width: 450, height: 203 });
    expect(getSurfaceCanvasSize(
      { id: "top", diameterMm: 180 },
      "plate-standard",
    )).toEqual({ width: 450, height: 450 });
  });

  it("scales and centers artwork when adapting it to another surface", () => {
    const adapted = adaptCanvasToSurface(
      { objects: [{ left: 20, top: 10, scaleX: 0.5, scaleY: 2 }] },
      { width: 200, height: 100 },
      { width: 400, height: 400 },
    );

    expect(adapted.objects[0]).toMatchObject({
      left: 40,
      top: 120,
      scaleX: 1,
      scaleY: 4,
    });
  });

  it("derives production pixels from millimeters and the model DPI", () => {
    expect(getProductionSize(
      { production_template: { resolutionDpi: 300 } },
      { widthMm: 200, heightMm: 90 },
    )).toEqual({ dpi: 300, width: 2362, height: 1063 });
  });
});
