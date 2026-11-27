// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import UniversalProductModel from "./UniversalProductModel.jsx";

vi.mock("@react-three/drei", () => ({ Html: ({ children }) => <div>{children}</div> }));

afterEach(cleanup);

describe("products without a verified 3D asset", () => {
  it.each([
    { id: "cap-standard", name: "Gorra estándar" },
    { id: "plate-standard", name: "Plato estándar" },
    { id: "mug-standard", name: "Taza estándar" },
    { id: "glass-standard", name: "Vaso estándar" },
  ])("reports that the real preview and print template are missing for $name", (model) => {
    render(<UniversalProductModel model={model} />);

    expect(screen.getByRole("status").textContent).toContain(model.name);
    expect(screen.getByRole("status").textContent).toContain("Falta un modelo 3D propio");
    expect(screen.getByRole("status").textContent).toContain("no está preparado para producción");
  });
});
