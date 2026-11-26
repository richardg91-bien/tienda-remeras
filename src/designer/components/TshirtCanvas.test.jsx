// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TshirtCanvas from "./TshirtCanvas.jsx";

vi.mock("../hooks/useTshirtCanvas.jsx", () => ({
  useTshirtCanvas: () => ({ canvasRef: { current: null }, tshirtColor: "#ffffff" }),
}));

afterEach(cleanup);

describe("TshirtCanvas print guides", () => {
  const props = {
    view: "front",
    model: {
      id: "tee-classic",
      category: "textil",
      variant_schema: { sizes: ["M", "L"] },
    },
    surface: { id: "front", label: "Frente", widthMm: 300, heightMm: 400 },
  };

  it("selects and adjusts a guide per size, and hides or shows it independently of Fabric", () => {
    const { container } = render(<TshirtCanvas {...props} />);
    const canvas = container.querySelector("canvas");
    const zoneSelect = screen.getByRole("combobox", { name: "Zona de estampado" });
    const sizeSelect = screen.getByRole("combobox", { name: "Talle de referencia de la guía" });
    const widthInput = screen.getByRole("spinbutton", { name: "Ancho de la guía en centímetros" });
    const visibleGuide = () => container.querySelector('svg[aria-hidden="true"]');

    expect(visibleGuide()?.textContent).toContain("30 × 35 cm");
    expect(visibleGuide()?.querySelectorAll("g")).toHaveLength(4);
    expect(visibleGuide()?.textContent).toContain("23 × 23 cm");
    expect(visibleGuide()?.textContent).toContain("12 × 35 cm");
    expect(visibleGuide()?.textContent).toContain("27 × 7 cm");
    expect(canvas?.parentElement?.querySelector("svg[aria-hidden='true']")).toBe(visibleGuide());

    fireEvent.change(zoneSelect, { target: { value: "front-medium" } });
    fireEvent.change(widthInput, { target: { value: "25" } });
    expect(visibleGuide()?.textContent).toContain("25 × 23 cm");

    fireEvent.change(sizeSelect, { target: { value: "L" } });
    expect(widthInput.value).toBe("23");
    fireEvent.change(widthInput, { target: { value: "24" } });
    fireEvent.change(sizeSelect, { target: { value: "M" } });
    expect(widthInput.value).toBe("25");
    fireEvent.change(sizeSelect, { target: { value: "L" } });
    expect(widthInput.value).toBe("24");

    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar guías" }));
    expect(visibleGuide()).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar guías" }));
    expect(visibleGuide()?.textContent).toContain("24 × 23 cm");
  });

  it("only displays guides for the selected real model and keeps child tables separate", () => {
    const { container, rerender } = render(<TshirtCanvas {...props} />);
    const guideSvg = () => container.querySelector('svg[aria-hidden="true"]');
    expect(guideSvg()?.textContent).not.toContain("10 × 5 cm");
    rerender(<TshirtCanvas {...props} model={{ id: "cap-standard", name: "Gorra", category: "accesorios" }} surface={{ id: "front-panel", label: "Panel frontal", widthMm: 120, heightMm: 60 }} />);
    expect(guideSvg()?.querySelectorAll("g")).toHaveLength(4);
    for (const size of ["10 × 5 cm", "12 × 6 cm", "6 × 4 cm", "5 × 5 cm"]) expect(guideSvg()?.textContent).toContain(size);

    rerender(<TshirtCanvas {...props} model={{ id: "tee-infantil", name: "Remera infantil", category: "textil" }} />);
    const tableSelect = screen.getByRole("combobox", { name: "Tabla de medidas infantiles" });
    const ageSelect = screen.getByRole("combobox", { name: "Talle o rango de edad" });
    expect(ageSelect.options).toHaveLength(5);
    expect(screen.getByRole("table", { name: "Ancho y alto de referencia por edad" })).toBeTruthy();
    expect(guideSvg()).toBeNull();

    fireEvent.change(tableSelect, { target: { value: "recommended-prints" } });
    expect(screen.getByRole("table", { name: "Tamaños de estampado recomendados por edad" })).toBeTruthy();
    expect(ageSelect.options).toHaveLength(4);
    const zoneSelect = screen.getByRole("combobox", { name: "Zona de estampado" });
    expect(zoneSelect.options).toHaveLength(2);
    fireEvent.change(ageSelect, { target: { value: "age-7-11" } });
    fireEvent.change(zoneSelect, { target: { value: "infant-print-age-7-11" } });
    expect(guideSvg()?.textContent).toContain("19 × 25 cm");
  });
});
