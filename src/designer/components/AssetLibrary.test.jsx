// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssetLibrary from "./AssetLibrary.jsx";
import { getPrivateDesignAssetUrl, listPrivateDesignAssets } from "../utils/designerApi.js";

const { canvas, fromURL, sync } = vi.hoisted(() => {
  const canvas = {
    width: 450,
    height: 500,
    add: vi.fn(),
    setActiveObject: vi.fn(),
    renderAll: vi.fn(),
  };
  const image = {
    width: 100,
    height: 100,
    scale: vi.fn(),
    getScaledWidth: () => 100,
    getScaledHeight: () => 100,
    set: vi.fn(),
  };
  return { canvas, fromURL: vi.fn().mockResolvedValue(image), sync: vi.fn() };
});

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ designer: { selectedView: "front" } }),
}));
vi.mock("../hooks/useCanvas.jsx", () => ({ useCanvas: () => ({ frontCanvas: canvas, backCanvas: null }) }));
vi.mock("fabric", () => ({ Image: { fromURL } }));
vi.mock("../utils/designerApi.js", () => ({
  getPrivateDesignAssetUrl: vi.fn().mockResolvedValue("http://127.0.0.1:8787/api/private-assets/file?signed=1"),
  listPrivateDesignAssets: vi.fn().mockResolvedValue([{
    path: "user/project/image.png",
    name: "image.png",
    mimeType: "image/png",
    url: "http://127.0.0.1:8787/api/private-assets/file?preview=1",
  }]),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Cloudflare private asset library", () => {
  it("uses the existing private R2 route and loads the signed image into the active surface", async () => {
    localStorage.setItem("accessToken", "synthetic-local-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ persistence: "d1+r2" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AssetLibrary manualSync={sync} />);

    await waitFor(() => expect(listPrivateDesignAssets).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/health$/);
    expect(fetchMock.mock.calls.some(([url]) => /\/api\/assets(?:\?|\/|$)/.test(url))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Mis archivos/ }));
    fireEvent.click(await screen.findByRole("button", { name: /image\.png/ }));
    await waitFor(() => expect(canvas.add).toHaveBeenCalledOnce());
    expect(getPrivateDesignAssetUrl).toHaveBeenCalledWith("user/project/image.png");
    expect(fromURL).toHaveBeenCalledWith(expect.stringContaining("signed=1"), { crossOrigin: "anonymous" });
    expect(canvas.setActiveObject).toHaveBeenCalledOnce();
    expect(canvas.renderAll).toHaveBeenCalledOnce();
    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
  });
});
