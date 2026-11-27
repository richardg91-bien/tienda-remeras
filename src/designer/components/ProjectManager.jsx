import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedProductRef,
  setSelectedSurfaceId,
  setSelectedView,
  setTshirtColor,
  setSelectedCatalogProductId,
  setSelectedSize,
} from "../store/designerSlice.js";
import canvasStorageManager from "../utils/canvasStorageManager.js";
import {
  getDesignProject,
  listDesignProjects,
  saveDesignProject,
  serializeCanvasForProject,
} from "../utils/designerApi.js";
import {
  getProductSurfaces,
  getProductionSize,
  getSurfaceCanvasSize,
} from "../utils/surfaceUtils.js";

function serializeSurface(canvas, surface, productRef) {
  if (canvas) {
    return {
      ...serializeCanvasForProject(canvas),
      width: canvas.width,
      height: canvas.height,
    };
  }

  const objects = canvasStorageManager.loadProductCanvasObjects(productRef, surface.id);
  if (objects === null) return null;
  const size = getSurfaceCanvasSize(surface, productRef);
  return { version: "7.4.0", width: size.width, height: size.height, objects };
}

export default function ProjectManager({
  frontCanvas,
  backCanvas,
  tshirtColor,
  productModels = [],
  productModel,
  onProjectLoad,
}) {
  const dispatch = useDispatch();
  const selectedSurfaceId = useSelector((state) => state.designer.selectedSurfaceId);
  const selectedCatalogProductId = useSelector((state) => state.designer.selectedCatalogProductId);
  const selectedSize = useSelector((state) => state.designer.selectedSize);
  const [name, setName] = useState("Mi diseño");
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const signedIn = Boolean(localStorage.getItem("accessToken"));

  const refreshProjects = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      setProjects(await listDesignProjects());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) Promise.resolve().then(refreshProjects);
  }, [signedIn, refreshProjects]);

  const save = async () => {
    if (!productModel || getProductSurfaces(productModel).length === 0 || (!frontCanvas && !backCanvas)) {
      setError("El editor necesita un modelo con superficies físicas configuradas antes de guardar.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    try {
      const products = {};
      const production = { products: {} };

      for (const model of productModels) {
        const surfaces = {};
        const modelSurfaces = getProductSurfaces(model);
        modelSurfaces.forEach((surface, index) => {
          const canvas = model.id === productModel.id
            ? index === 0 ? frontCanvas : backCanvas
            : null;
          const serialized = serializeSurface(canvas, surface, model.id);
          if (serialized) surfaces[surface.id] = serialized;

          const outputSize = getProductionSize(model, surface);
          if (outputSize) {
            production.products[model.id] ||= { template: model.production_template || {}, surfaces: {} };
            production.products[model.id].surfaces[surface.id] = outputSize;
          }
        });
        if (Object.keys(surfaces).length > 0) products[model.id] = { surfaces };
      }

      const activeProduct = products[productModel.id];
      const activeSurface = getProductSurfaces(productModel).find(
        (surface) => surface.id === selectedSurfaceId,
      ) || getProductSurfaces(productModel)[0];
      const activeSize = activeSurface
        ? getSurfaceCanvasSize(activeSurface, productModel.id)
        : { width: frontCanvas?.width || backCanvas.width, height: frontCanvas?.height || backCanvas.height };
      const saved = await saveDesignProject({
        ...(projectId ? { id: projectId } : {}),
        name: name.trim() || "Proyecto sin título",
        productRef: productModel.id,
        productCategory: productModel.category || "textil",
        variant: {
          ...(productModel.id === "tee-classic" || productModel.variant_schema?.colors?.length
            ? { color: tshirtColor }
            : {}),
          surfaceId: activeSurface?.id || "front",
          ...(selectedCatalogProductId ? { catalogProductId: selectedCatalogProductId } : {}),
          ...(selectedSize ? { size: selectedSize } : {}),
        },
        canvas: {
          version: "7.4.0",
          width: activeSize.width,
          height: activeSize.height,
          products,
          surfaces: activeProduct?.surfaces || {},
        },
        previewUrl: "",
        production,
      });
      setProjectId(saved.id);
      setName(saved.name);
      setNotice("Proyecto guardado en tu biblioteca.");
      await refreshProjects();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (id) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const project = await getDesignProject(id);
      const projectCanvas = project.canvas || {};
      const activeRef = project.productRef || project.product_ref || "tee-classic";
      const selectedModel = productModels.find((model) => model.id === activeRef);
      if (!selectedModel) {
        throw new Error("El producto de este proyecto ya no está disponible en el catálogo.");
      }
      const selectedSurfaces = getProductSurfaces(selectedModel);
      if (selectedSurfaces.length === 0) {
        throw new Error("El producto del proyecto no informa superficies imprimibles físicas.");
      }
      const storedProducts = projectCanvas.products || {
        [activeRef]: { surfaces: projectCanvas.surfaces || projectCanvas },
      };

      canvasStorageManager.clearCanvasStorage("all");
      for (const model of productModels) {
        for (const surface of getProductSurfaces(model)) {
          canvasStorageManager.clearProductCanvasObjects(model.id, surface.id);
        }
      }
      for (const [productRef, product] of Object.entries(storedProducts)) {
        for (const [surfaceId, value] of Object.entries(product?.surfaces || {})) {
          const canvasJson = value?.canvas || value;
          if (Array.isArray(canvasJson?.objects)) {
            canvasStorageManager.saveProductCanvasObjects(productRef, surfaceId, canvasJson.objects);
          }
        }
      }

      if (selectedModel) {
        const savedSurfaceId = project.variant?.surfaceId;
        const selectedSurface = selectedSurfaces.find(
          (surface) => surface.id === savedSurfaceId,
        ) || selectedSurfaces[0];
        const surfaceIndex = selectedSurfaces.indexOf(selectedSurface);
        dispatch(setSelectedProductRef(selectedModel.id));
        dispatch(setSelectedSurfaceId(selectedSurface?.id || "front"));
        dispatch(setSelectedView(surfaceIndex === 1 ? "back" : "front"));
      }
      if (project.variant?.color) dispatch(setTshirtColor(project.variant.color));
      if (project.variant?.catalogProductId) {
        dispatch(setSelectedCatalogProductId(String(project.variant.catalogProductId)));
      }
      if (project.variant?.size) dispatch(setSelectedSize(project.variant.size));
      onProjectLoad?.();
      setProjectId(project.id);
      setName(project.name || "Mi diseño");
      setNotice("Diseño cargado. Podés seguir editándolo.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 text-xs" aria-label="Proyectos guardados">
      <div>
        <label htmlFor="project-name" className="mb-1.5 block font-bold text-gray-700">
          Nombre del proyecto
        </label>
        <input
          id="project-name"
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-[#e2e4ed] bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#9281d9]"
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="rounded-xl bg-[#d9d4f2] px-3 py-2.5 font-bold text-gray-900 transition hover:bg-[#c7bdeb] disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Guardando…" : projectId ? "Actualizar proyecto" : "Guardar proyecto"}
      </button>

      {!signedIn && (
        <p className="rounded-xl bg-gray-50 p-3 leading-relaxed text-gray-600">
          El guardado en la nube requiere iniciar sesión. Tu diseño actual sigue guardándose en este dispositivo.
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-cyan-50 p-3 text-gray-800">{notice}</p>}

      {signedIn && (
        <div className="border-t border-[#e2e4ed] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Mis proyectos</h3>
            <button type="button" onClick={refreshProjects} disabled={loading} className="text-gray-600 underline">
              Actualizar
            </button>
          </div>
          {projects.length === 0 && !loading ? (
            <p className="text-gray-500">Todavía no guardaste proyectos.</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => openProject(project.id)}
                    disabled={loading}
                    className={`w-full rounded-lg px-3 py-2 text-left transition hover:bg-violet-50 disabled:opacity-50 ${
                      project.id === projectId ? "bg-violet-50 font-bold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {project.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
