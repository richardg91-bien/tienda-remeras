// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectManager from "./ProjectManager.jsx";
import designerReducer, {
  setSelectedCatalogProductId,
  setSelectedSize,
  setSelectedSurfaceId,
} from "../store/designerSlice.js";

const { getDesignProject, listDesignProjects, saveDesignProject } = vi.hoisted(() => ({
  getDesignProject: vi.fn(),
  listDesignProjects: vi.fn(),
  saveDesignProject: vi.fn(),
}));

vi.mock("../utils/designerApi.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getDesignProject, listDesignProjects, saveDesignProject };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

beforeEach(() => {
  localStorage.setItem("accessToken", "test-session");
  listDesignProjects.mockResolvedValue([]);
  saveDesignProject.mockResolvedValue({ id: "project-1", name: "Remera" });
});

function renderManager(props = {}) {
  const store = configureStore({ reducer: { designer: designerReducer } });
  store.dispatch(setSelectedSurfaceId("front"));
  store.dispatch(setSelectedCatalogProductId("catalog-tee-1"));
  store.dispatch(setSelectedSize("L"));
  const model = {
    id: "tee-classic",
    category: "textil",
    print_surfaces: [
      { id: "front", label: "Frente", widthMm: 300, heightMm: 400 },
      { id: "back", label: "Espalda", widthMm: 300, heightMm: 400 },
    ],
    production_template: { resolutionDpi: 300 },
  };
  const view = render(
    <Provider store={store}>
      <ProjectManager
        frontCanvas={{ width: 600, height: 800, toJSON: () => ({ version: "7.4.0", objects: [{ text: "FRENTE" }] }) }}
        backCanvas={{ width: 600, height: 800, toJSON: () => ({ version: "7.4.0", objects: [{ text: "ESPALDA" }] }) }}
        tshirtColor="#0486D7"
        productModels={[model]}
        productModel={model}
        {...props}
      />
    </Provider>,
  );
  return { ...view, store };
}

describe("ProjectManager flat surface persistence", () => {
  it("saves front and back designs plus the selected catalog variant", async () => {
    renderManager();
    await waitFor(() => expect(listDesignProjects).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Guardar proyecto" }));

    await waitFor(() => expect(saveDesignProject).toHaveBeenCalledTimes(1));
    const saved = saveDesignProject.mock.calls[0][0];
    expect(saved.variant).toMatchObject({
      catalogProductId: "catalog-tee-1",
      size: "L",
      color: "#0486D7",
    });
    expect(saved.canvas.products["tee-classic"].surfaces).toMatchObject({
      front: { objects: [{ text: "FRENTE" }] },
      back: { objects: [{ text: "ESPALDA" }] },
    });
  });

  it("restores each stored surface into its own local canvas slot", async () => {
    listDesignProjects.mockResolvedValue([{ id: "project-1", name: "Remera guardada" }]);
    getDesignProject.mockResolvedValue({
      id: "project-1",
      name: "Remera guardada",
      productRef: "tee-classic",
      variant: { surfaceId: "back", size: "L", catalogProductId: "catalog-tee-1", color: "#0486D7" },
      canvas: {
        products: {
          "tee-classic": {
            surfaces: {
              front: { objects: [{ text: "FRENTE RECUPERADO" }] },
              back: { objects: [{ text: "ESPALDA RECUPERADA" }] },
            },
          },
        },
      },
    });
    const { store } = renderManager();
    fireEvent.click(await screen.findByRole("button", { name: "Remera guardada" }));

    await waitFor(() => expect(getDesignProject).toHaveBeenCalledWith("project-1"));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("neon-stitch-designer:tee-classic:front")))
        .toEqual([{ text: "FRENTE RECUPERADO" }]);
      expect(JSON.parse(localStorage.getItem("neon-stitch-designer:tee-classic:back")))
        .toEqual([{ text: "ESPALDA RECUPERADA" }]);
    });
    expect(store.getState().designer).toMatchObject({
      selectedSurfaceId: "back",
      selectedSize: "L",
      selectedCatalogProductId: "catalog-tee-1",
      tshirtColor: "#0486D7",
    });
  });
});
