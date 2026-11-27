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

    expect([...zoneSelect.options].map((option) => option.textContent)).toEqual([
      "Frente completo", "Frente medio", "Vertical", "Horizontal",
    ]);
    expect(visibleGuide()?.querySelectorAll("g")).toHaveLength(4);
    expect(widthInput.value).toBe("30");
    expect(screen.getByRole("spinbutton", { name: "Alto de la guía en centímetros" }).value).toBe("35");
    expect(screen.getByText(/Las medidas son orientativas y sirven como referencia del estampado/)).toBeTruthy();
    expect(screen.getByText("No son medidas de fabricación verificadas.")).toBeTruthy();
    expect(screen.getByLabelText("Referencia visual de áreas").textContent).toContain("Superficie completa de la prenda");
    expect(screen.getByLabelText("Referencia visual de áreas").textContent).toContain("Zona de estampado");
    expect(visibleGuide()?.querySelector("rect")?.getAttribute("fill")).toBe("rgba(120,102,194,0.18)");
    expect(canvas?.parentElement?.querySelector("svg[aria-hidden='true']")).toBe(visibleGuide());

    fireEvent.change(zoneSelect, { target: { value: "front-medium" } });
    fireEvent.change(widthInput, { target: { value: "25" } });
    expect(widthInput.value).toBe("25");

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
    expect(visibleGuide()?.querySelectorAll("g")).toHaveLength(4);
    expect(widthInput.value).toBe("24");
  });

  it("only displays guides for the selected real model and keeps child tables separate", () => {
    const { container, rerender } = render(<TshirtCanvas {...props} />);
    const guideSvg = () => container.querySelector('svg[aria-hidden="true"]');
    expect(guideSvg()?.textContent).not.toContain("10 × 5 cm");
    rerender(<TshirtCanvas {...props} model={{ id: "cap-standard", name: "Gorra", category: "accesorios" }} surface={{ id: "front-panel", label: "Panel frontal", widthMm: 120, heightMm: 60 }} />);
    expect(guideSvg()?.querySelectorAll("g")).toHaveLength(4);
    expect(screen.getByRole("spinbutton", { name: "Ancho de la guía en centímetros" }).value).toBe("10");
    expect(screen.getByRole("spinbutton", { name: "Alto de la guía en centímetros" }).value).toBe("5");

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
    expect(screen.getByRole("spinbutton", { name: "Ancho de la guía en centímetros" }).value).toBe("19");
    expect(screen.getByRole("spinbutton", { name: "Alto de la guía en centímetros" }).value).toBe("25");
  });
});
