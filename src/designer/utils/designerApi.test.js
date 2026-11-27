// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDesignProject,
  hydrateProjectCanvas,
  listDesignProjects,
  saveDesignProject,
  serializeCanvasForProject,
} from "./designerApi.js";

const testUserId = "2f64a884-8719-4c27-9b40-6ae9d5730c25";
const testProjectId = "32d50c82-7530-486b-a7a5-b96a609e5218";
const accessTokenFor = (id) => `header.${btoa(JSON.stringify({ id })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("private asset persistence in saved canvases", () => {
  it("serializes paths instead of expiring signed URLs and refreshes each path once on restore", async () => {
    localStorage.setItem("accessToken", "synthetic-access-token");
    const saved = serializeCanvasForProject({
      toJSON: () => ({
        version: "7.4.0",
        objects: [
          { type: "Image", src: "https://signed.example/old", privateAssetPath: "user-a/file-a.png" },
          { type: "Group", objects: [
            { type: "Image", src: "https://signed.example/old", privateAssetPath: "user-a/file-a.png" },
          ] },
        ],
      }),
    });
    expect(saved.objects[0].src).toBe("private-asset:user-a/file-a.png");

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: "https://signed.example/refreshed" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const restored = await hydrateProjectCanvas(saved);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/private-assets/file?");
    expect(restored.objects[0].src).toBe("https://signed.example/refreshed");
    expect(restored.objects[1].objects[0].src).toBe("https://signed.example/refreshed");
    expect(restored.objects[0].crossOrigin).toBe("anonymous");
  });

  it("keeps local data URLs usable without making private-storage requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const restored = await hydrateProjectCanvas({
      objects: [{ type: "Image", src: "data:image/png;base64,AA==", privateAssetPath: "user-a/file-a.png" }],
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(restored.objects[0].src).toBe("data:image/png;base64,AA==");
  });
});

describe("project API integration", () => {
  it("lists, creates, updates and opens projects through the existing routes", async () => {
    localStorage.setItem("accessToken", accessTokenFor(testUserId));
    localStorage.setItem(`designerDraftProjectId:${testUserId}`, testProjectId);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [{ id: testProjectId, name: "Mi remera" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ project: { id: testProjectId, name: "Mi remera" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ project: { id: testProjectId, name: "Actualizada" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          project: {
            id: testProjectId,
            product_ref: "tee-classic",
            variant: { size: "L", catalogProductId: "4", color: "#0486D7" },
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const project = {
      name: "Mi remera",
      productRef: "tee-classic",
      productCategory: "textil",
      variant: { size: "L", catalogProductId: "4", color: "#0486D7" },
      canvas: { products: {} },
      production: {},
    };

    await expect(listDesignProjects()).resolves.toEqual([{ id: testProjectId, name: "Mi remera" }]);
    await expect(saveDesignProject(project)).resolves.toMatchObject({ id: testProjectId });
    await expect(saveDesignProject({ ...project, id: testProjectId, name: "Actualizada" }))
      .resolves.toMatchObject({ name: "Actualizada" });
    await expect(getDesignProject(testProjectId)).resolves.toMatchObject({
      product_ref: "tee-classic",
      variant: { size: "L", catalogProductId: "4" },
    });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/projects$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/projects$/);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(fetchMock.mock.calls[2][0]).toMatch(new RegExp(`/api/projects/${testProjectId}$`));
    expect(fetchMock.mock.calls[2][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[3][0]).toMatch(new RegExp(`/api/projects/${testProjectId}$`));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).draftId).toBe(testProjectId);
  });
});
