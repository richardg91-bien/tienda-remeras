// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getCanvasTexture } = vi.hoisted(() => ({ getCanvasTexture: vi.fn() }));

vi.mock("../utils/canvasSyncManager.js", () => ({
  canvasSyncManager: {
    getCanvasTexture,
    debounce: (callback, delay) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
      };
    },
  },
}));

import { useCanvasTextureSync } from "./useCanvasTextureSync.jsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function makeCanvas() {
  const listeners = new Map();
  return {
    on: vi.fn((event, callback) => listeners.set(event, callback)),
    off: vi.fn((event) => listeners.delete(event)),
    emit: (event) => listeners.get(event)?.(),
  };
}

describe("useCanvasTextureSync", () => {
  it("updates the matching 3D texture when either flat Fabric surface changes", async () => {
    vi.useFakeTimers();
    const frontCanvas = makeCanvas();
    const backCanvas = makeCanvas();
    getCanvasTexture
      .mockResolvedValueOnce("front-initial")
      .mockResolvedValueOnce("back-initial")
      .mockResolvedValueOnce("front-edited")
      .mockResolvedValueOnce("back-edited");

    const { result } = renderHook(() => useCanvasTextureSync({ frontCanvas, backCanvas }));
    await act(async () => {});
    expect(result.current.designTextureFront).toBe("front-initial");
    expect(result.current.designTextureBack).toBe("back-initial");

    await act(async () => {
      frontCanvas.emit("object:modified");
      await vi.advanceTimersByTimeAsync(80);
    });
    expect(result.current.designTextureFront).toBe("front-edited");
    expect(result.current.designTextureBack).toBe("back-initial");

    await act(async () => {
      backCanvas.emit("object:added");
      await vi.advanceTimersByTimeAsync(80);
    });
    expect(result.current.designTextureBack).toBe("back-edited");
  });
});
