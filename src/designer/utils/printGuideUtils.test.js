import { describe, expect, it } from "vitest";
import {
  CAP_PRINT_ZONES,
  CHILD_BODY_SIZE_REFERENCES,
  CHILD_RECOMMENDED_PRINT_SIZES,
  PRINT_GUIDE_PROFILES,
  clampPrintGuideDimension,
  getPrintGuideDimensionBounds,
  getPrintGuideFamily,
  getPrintGuideProductOptions,
  getPrintGuideRect,
  getInfantAgeOptions,
  getPrintGuidesForSurface,
  getPrintGuidesForSelection,
} from "./printGuideUtils.js";
import {
  centimetersToMillimeters,
  millimetersToCanvasPixels,
  millimetersToCentimeters,
} from "./surfaceUtils.js";

describe("print guide measurements", () => {
  it("provides all four shirt zones on the front and keeps the back unconfigured", () => {
    const shirt = { id: "tee-classic", category: "textil" };
    expect(getPrintGuidesForSurface(shirt, { id: "front", widthMm: 300, heightMm: 400 }).map(({ widthCm, heightCm }) => [widthCm, heightCm]))
      .toEqual([[30, 35], [23, 23], [12, 35], [27, 7]]);
    expect(getPrintGuidesForSurface(shirt, { id: "back" })).toEqual([]);
  });

  it("provides hoodie zones by their declared printable surface", () => {
    const hoodie = { id: "hoodie-classic", category: "textil", name: "Hoodie" };
    expect(getPrintGuideFamily(hoodie)).toBe("hoodie");
    expect(getPrintGuidesForSurface(hoodie, { id: "front", widthMm: 300, heightMm: 400 })).toHaveLength(3);
    expect(getPrintGuidesForSurface(hoodie, { id: "back", widthMm: 300, heightMm: 400 })).toMatchObject([
      { id: "hoodie-back", widthCm: 33.5, heightCm: 37.5 },
    ]);
    expect(getPrintGuidesForSurface(hoodie, { id: "sleeve", widthMm: 100, heightMm: 300 })).toMatchObject([
      { id: "hoodie-sleeve-logo", widthCm: 8, heightCm: 25 },
    ]);
    expect(PRINT_GUIDE_PROFILES.hoodie.zones).toHaveLength(5);
  });

  it("keeps all four cap guides on the front surface only", () => {
    const cap = { id: "cap-standard", name: "Gorra", category: "accesorios" };
    expect(getPrintGuideFamily(cap)).toBe("cap");
    expect(getPrintGuidesForSurface(cap, { id: "front-panel", label: "Panel frontal", widthMm: 120, heightMm: 60 }))
      .toMatchObject([
        { widthCm: 10, heightCm: 5 },
        { widthCm: 12, heightCm: 6 },
        { widthCm: 6, heightCm: 4 },
        { widthCm: 5, heightCm: 5 },
      ]);
    expect(getPrintGuidesForSelection("cap", { id: "side" })).toEqual([]);
    expect(getPrintGuideProductOptions({ id: "tee-classic", category: "textil" }))
      .toMatchObject([{ id: "adult-shirt" }, { id: "infant-shirt" }, { id: "cap" }]);
  });

  it("keeps infant age ranges separate from recommended print sizes", () => {
    expect(CHILD_BODY_SIZE_REFERENCES.map(({ widthRangeCm, heightRangeCm }) => [widthRangeCm, heightRangeCm]))
      .toEqual([[[8, 10], [8, 10]], [[14, 16], [17, 19]], [[17, 19], [19, 21]], [[18, 20], [24, 26]], [[20, 22], [29, 31]]]);
    expect(CHILD_RECOMMENDED_PRINT_SIZES.map(({ widthCm, heightCm }) => [widthCm, heightCm]))
      .toEqual([[15, 18], [18, 20], [19, 25], [21, 30], [8, 8]]);
    const ageCases = [
      ["newborn", 9, 9, "8–10 × 8–10 cm"],
      ["age-1-3", 15, 18, "14–16 × 17–19 cm"],
      ["age-4-6", 18, 20, "17–19 × 19–21 cm"],
      ["age-7-11", 19, 25, "18–20 × 24–26 cm"],
      ["age-12-16", 21, 30, "20–22 × 29–31 cm"],
    ];
    expect(getInfantAgeOptions("age-dimensions")).toHaveLength(ageCases.length);
    for (const [ageId, widthCm, heightCm, referenceRange] of ageCases) {
      expect(getPrintGuidesForSelection("infant-shirt", { id: "front" }, {
        childTable: "age-dimensions",
        ageId,
      })).toMatchObject([{ widthCm, heightCm, referenceRange }]);
    }

    const printCases = [
      ["age-1-3", 15, 18],
      ["age-4-6", 18, 20],
      ["age-7-11", 19, 25],
      ["age-12-16", 21, 30],
    ];
    expect(getInfantAgeOptions("recommended-prints")).toHaveLength(printCases.length);
    for (const [ageId, widthCm, heightCm] of printCases) {
      expect(getPrintGuidesForSelection("infant-shirt", { id: "front" }, {
        childTable: "recommended-prints",
        ageId,
      })).toMatchObject([
        { widthCm, heightCm, recommendedRange: `${widthCm} × ${heightCm} cm` },
        { id: "infant-chest-logo", widthCm: 8, heightCm: 8 },
      ]);
    }
    expect(getPrintGuideDimensionBounds({ widthCm: 8, adjustmentRangeCm: null }, "width"))
      .toEqual({ min: 0.1, max: undefined });
  });

  it("defines four cap placements and refuses to project them onto a non-cap catalog item", () => {
    expect(CAP_PRINT_ZONES.map(({ widthCm, heightCm }) => [widthCm, heightCm]))
      .toEqual([[10, 5], [12, 6], [6, 4], [5, 5]]);
    const adultShirt = { id: "tee-classic", category: "textil" };
    const actualFront = { id: "front", label: "Frente", widthMm: 300, heightMm: 400 };
    expect(getPrintGuidesForSurface(adultShirt, actualFront).map(({ id }) => id))
      .not.toContain("cap-standard");
    expect(getPrintGuidesForSurface({ id: "cap-standard", name: "Gorra", category: "accesorios" }, { id: "front", label: "Frente" }))
      .toEqual([]);
  });

  it("converts cm to mm and maps physical dimensions to existing canvas pixels", () => {
    expect(centimetersToMillimeters(30)).toBe(300);
    expect(millimetersToCentimeters(350)).toBe(35);
    expect(millimetersToCanvasPixels(300, 300, 450)).toBe(450);
    expect(millimetersToCanvasPixels(350, 400, 500)).toBe(437.5);
  });

  it("allows guide adjustment within approximately two centimeters", () => {
    const guide = PRINT_GUIDE_PROFILES.shirt.zones[0];
    expect(getPrintGuideDimensionBounds(guide, "width")).toEqual({ min: 28, max: 32 });
    expect(clampPrintGuideDimension(40, guide, "width")).toBe(32);
    expect(clampPrintGuideDimension(34.6, guide, "height")).toBe(34.6);
  });

  it("centers a guide for visual reference without inventing garment placement offsets", () => {
    const rect = getPrintGuideRect(
      PRINT_GUIDE_PROFILES.shirt.zones[0],
      { widthCm: 30, heightCm: 35 },
      { widthMm: 300, heightMm: 400 },
      { width: 450, height: 500 },
    );
    expect(rect).toEqual({ x: 0, y: 31.25, width: 450, height: 437.5, exceedsSurface: false });
  });
});
