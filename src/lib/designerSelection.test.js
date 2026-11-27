import { describe, expect, it } from "vitest";
import { buildDesignerSelectionUrl } from "./designerSelection.js";

describe("buildDesignerSelectionUrl", () => {
  it("transmits the technical model and catalog variants", () => {
    const url = buildDesignerSelectionUrl(
      { id: 4, productRef: "tee-classic" },
      { size: "L", color: "#0486D7" },
    );

    expect(url).toBe(
      "/disenar?productRef=tee-classic&catalogProductId=4&size=L&color=%230486D7",
    );
  });

  it("defaults to the adult tee technical model", () => {
    expect(buildDesignerSelectionUrl({ id: 2 })).toBe(
      "/disenar?productRef=tee-classic&catalogProductId=2",
    );
  });
});
