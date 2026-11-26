import { Suspense, useState, useEffect, useCallback } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Loader } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";

import designerStore                 from "../designer/store/designerStore.js";
import {
  setSelectedProductRef,
  setSelectedSurfaceId,
  setSelectedView,
  setTshirtColor,
} from "../designer/store/designerSlice.js";
import { CanvasProvider, useCanvas } from "../designer/hooks/useCanvas.jsx";
import { useCanvasTextureSync }      from "../designer/hooks/useCanvasTextureSync.jsx";
import { TshirtModel }               from "../designer/components/TshirtModel.jsx";
import UniversalProductModel         from "../designer/components/UniversalProductModel.jsx";
import TshirtCanvas                  from "../designer/components/TshirtCanvas.jsx";
import DesignTools                   from "../designer/components/DesignTools.jsx";
import SizeSelectorModal             from "../designer/components/SizeSelectorModal.jsx";
import { TSHIRT_TYPES }              from "../designer/constants/designConstants.js";
import { listProductModels } from "../designer/utils/designerApi.js";
import { getProductSurfaces }         from "../designer/utils/surfaceUtils.js";
import StudioOnboarding              from "../components/StudioOnboarding.jsx";

const FALLBACK_PRODUCT_MODELS = [{
  id: "tee-classic",
  name: "Remera clásica",
  category: "textil",
  print_surfaces: [
    { id: "front", label: "Frente", widthMm: 300, heightMm: 400 },
    { id: "back", label: "Espalda", widthMm: 300, heightMm: 400 },
  ],
  production_template: { resolutionDpi: 300 },
}];

function getProductColorOptions(model) {
  return (Array.isArray(model?.variant_schema?.colors)
    ? model.variant_schema.colors
    : []
  ).map((color) => {
    if (typeof color === "string") return { value: color, label: color };
    const value = color?.hex || color?.value || color?.id;
    return value ? { value, label: color.name || color.label || value } : null;
  }).filter(Boolean);
}

function ProductPreview({ model, tshirtColor, frontTexture, backTexture, selectedTexture, onViewChange }) {
  const isTshirt = model?.id === "tee-classic";

  return (
    <Canvas camera={{ position: [0, 0.25, isTshirt ? 5 : 4.2], fov: isTshirt ? 45 : 48 }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      <directionalLight position={[-5, 2, -3]} intensity={0.45} color="#fff4e6" />
      <OrbitControls enableZoom minDistance={2.2} maxDistance={8} />
      <Suspense fallback={null}>
        {isTshirt ? (
          <TshirtModel
            tshirtColor={tshirtColor}
            designTexture={frontTexture}
            designTextureBack={backTexture}
            onViewChange={onViewChange}
          />
        ) : (
          <UniversalProductModel
            model={model}
            designTexture={selectedTexture}
            productColor={model?.variant_schema?.colors?.length ? tshirtColor : undefined}
          />
        )}
      </Suspense>
    </Canvas>
  );
}

// Detecta el breakpoint real: los layouts desktop y mobile NO deben montarse
// ambos a la vez (aunque uno esté oculto con CSS), porque cada layout registra
// sus propios canvas de Fabric como frontCanvas/backCanvas en el contexto y el
// último en montar gana — haciendo que las imágenes de la biblioteca se peguen
// en un canvas invisible en lugar del 2D que el usuario está viendo.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

function DesignerContent() {
  const isDesktop    = useIsDesktop();
  const dispatch     = useDispatch();
  const tshirtColor  = useSelector((s) => s.designer.tshirtColor);
  const selectedView = useSelector((s) => s.designer.selectedView);
  const selectedType = useSelector((s) => s.designer.selectedType);
  const selectedProductRef = useSelector((s) => s.designer.selectedProductRef);
  const selectedSurfaceId = useSelector((s) => s.designer.selectedSurfaceId);
  const { frontCanvas, backCanvas, setSelectedObject } = useCanvas();
  const [productModels, setProductModels] = useState(FALLBACK_PRODUCT_MODELS);
  const [modelsError, setModelsError] = useState("");
  const [sourceDesign, setSourceDesign] = useState(null);
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  const reportCanvasError = useCallback((error) => {
    setModelsError(`No se pudo restaurar esta superficie: ${error.message}`);
  }, []);

  useEffect(() => {
    let active = true;
    listProductModels()
      .then((models) => {
        if (!active) return;
        if (!models.length) throw new Error("La API no devolvió modelos activos.");
        setProductModels(models);
        setModelsError("");
      })
      .catch((error) => {
        if (active) setModelsError(`No se pudieron cargar los modelos del catálogo: ${error.message}`);
      });
    return () => { active = false; };
  }, []);

  const productModel = productModels.find((model) => model.id === selectedProductRef) || productModels[0];
  const surfaces = getProductSurfaces(productModel);
  const selectedSurface = surfaces.find((surface) => surface.id === selectedSurfaceId) || surfaces[0];
  const surfaceIndex = Math.max(0, surfaces.indexOf(selectedSurface));
  const isTshirt = productModel?.id === "tee-classic";
  const { designTextureFront, designTextureBack, manualTriggerSync } =
    useCanvasTextureSync({ frontCanvas, backCanvas });
  const selectedTexture = surfaceIndex === 1 ? designTextureBack : designTextureFront;
  const colorOptions = getProductColorOptions(productModel);

  const manualSync = (view = selectedView) => manualTriggerSync(view);

  const handleSurfaceChange = (surface, index) => {
    setSelectedObject(null);
    dispatch(setSelectedSurfaceId(surface.id));
    dispatch(setSelectedView(index === 1 ? "back" : "front"));
  };

  const handleProductChange = (productRef) => {
    if (productRef === selectedProductRef) return;
    setSelectedObject(null);
    const activeCanvas = selectedView === "front" ? frontCanvas : backCanvas;
    if (activeCanvas) {
      setSourceDesign({
        json: activeCanvas.toJSON(["assetId", "privateAssetPath"]),
        width: activeCanvas.width,
        height: activeCanvas.height,
      });
    }
    const nextProduct = productModels.find((model) => model.id === productRef);
    const nextSurface = getProductSurfaces(nextProduct)[0];
    const nextColors = getProductColorOptions(nextProduct);
    if (nextColors.length && !nextColors.some((color) => color.value === tshirtColor)) {
      dispatch(setTshirtColor(nextColors[0].value));
    }
    dispatch(setSelectedProductRef(productRef));
    dispatch(setSelectedSurfaceId(nextSurface?.id || ""));
    dispatch(setSelectedView("front"));
  };
  const handleProjectLoad = () => {
    setSelectedObject(null);
    setSourceDesign(null);
    setCanvasGeneration((generation) => generation + 1);
  };
  const handleProductColorChange = (color) => dispatch(setTshirtColor(color));
  const [toolsOpen, setToolsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal de talle — montado SIEMPRE a nivel de página (fuera de paneles con
  // overflow/transform) para que quede adelante del 3D y nunca quede inaccesible.
  // Tanto el botón flotante mobile como el panel de herramientas disparan "studio:addToCart".

  const handleViewChange = (view) => {
    const index = view === "back" ? 1 : 0;
    if (surfaces[index]) handleSurfaceChange(surfaces[index], index);
  };

  return (
    <div className="designer-studio h-[calc(100dvh-144px)] bg-background md:h-[calc(100dvh-64px)]">

      {/* ══════════════════════════════════════
          DESKTOP
          Layout: [3D grande] [Canvas 2D] [panel tools flotante]
          ══════════════════════════════════════ */}
      {!isDesktop ? null : (
      <div className="flex flex-col h-full overflow-hidden relative z-0">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3
                        border-b border-white/8 bg-surface/40 backdrop-blur-xl flex-shrink-0">
          <div className="flex min-w-0 items-center gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-black text-sm">Diseñador universal</span>
              <select
                value={productModel.id}
                onChange={(event) => handleProductChange(event.target.value)}
                className="max-w-56 rounded-lg border border-[#e2e4ed] bg-white px-2 py-1.5 text-xs text-gray-800"
                aria-label="Producto"
              >
                {productModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-1 rounded-full border border-[#e2e4ed] bg-white p-1">
              {surfaces.map((surface, index) => (
                <button
                  key={surface.id}
                  onClick={() => handleSurfaceChange(surface, index)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    selectedSurface.id === surface.id ? "bg-[#d9d4f2] text-gray-900" : "text-gray-600 hover:bg-violet-50"
                  }`}
                >
                  {surface.label || surface.id}
                </button>
              ))}
            </div>
            {colorOptions.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                Color
                <select
                  value={tshirtColor}
                  onChange={(event) => handleProductColorChange(event.target.value)}
                  className="rounded-lg border border-[#e2e4ed] bg-white px-2 py-1.5"
                  aria-label="Color del producto"
                >
                  {colorOptions.map((color) => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Botón herramientas */}
          <button
            onClick={() => setToolsOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              toolsOpen ? "bg-primary text-background" : "glass-panel text-gray-800 border border-white/10 hover:border-primary/50"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            {toolsOpen ? "Cerrar" : "Herramientas"}
          </button>
        </div>

        {modelsError && (
          <p role="status" className="mx-4 mt-2 rounded-xl border border-[#e2e4ed] bg-white px-3 py-2 text-xs text-gray-700">
            {modelsError} Se mantiene el editor de remeras; los modelos de sublimación requieren que la API esté disponible.
          </p>
        )}

        {/* Área de trabajo */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* 3D — ocupa la mayor parte (isolate confina el canvas WebGL a su stacking context) */}
          <div className="flex-1 relative p-4 isolate z-0">
            <div className="absolute inset-4 rounded-3xl bg-primary/5 blur-[60px] pointer-events-none" />
            <div className="relative h-full glass-panel rounded-3xl overflow-hidden">
              <ProductPreview
                model={productModel}
                tshirtColor={tshirtColor}
                frontTexture={designTextureFront}
                backTexture={designTextureBack}
                selectedTexture={selectedTexture}
                onViewChange={handleViewChange}
              />
              {isTshirt && <Loader containerStyles={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.9)", borderRadius:"1.5rem" }}
                dataStyles={{ color:"#7060bf", fontSize:"12px" }} barStyles={{ backgroundColor:"#75d4e1", height:"2px" }} />}
            </div>
            <p className="text-center text-[11px] text-gray-600 mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[13px]">360</span>Arrastrá para rotar
            </p>
          </div>

          {/* Canvas 2D — siempre montados ambos, solo uno visible */}
          <div className="canvas-viewport flex h-full min-h-0 max-h-full flex-col items-center justify-center gap-3 overflow-hidden p-4 flex-shrink-0 isolate z-0 relative">
            {surfaces.length === 0 && (
              <p role="status" className="max-w-sm rounded-xl border border-[#e2e4ed] bg-white p-4 text-center text-sm text-gray-700">
                Este modelo no informa superficies imprimibles físicas. No se mostrarán guías hasta que el catálogo las defina.
              </p>
            )}
            {surfaces.map((surface, index) => (
              <div key={`${surface.id}-${canvasGeneration}`} className={selectedSurface.id === surface.id ? "block" : "hidden"}>
                <div className="glass-panel rounded-3xl overflow-hidden border border-white/8">
                  <TshirtCanvas
                    svgPath={index === 1
                      ? TSHIRT_TYPES[selectedType]?.backPath || TSHIRT_TYPES["crew-neck"].backPath
                      : TSHIRT_TYPES[selectedType]?.frontPath || TSHIRT_TYPES["crew-neck"].frontPath}
                    view={index === 1 ? "back" : "front"}
                    model={productModel}
                    surface={surface}
                    initialDesign={sourceDesign}
                    onLoadError={reportCanvasError}
                  />
                </div>
              </div>
            ))}
            {surfaces.length > 0 && <p className="text-[11px] text-gray-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">edit</span>
              Editá el diseño en el canvas
            </p>}
          </div>

          {/* Panel herramientas flotante — se abre sobre el 3D, no tapa el canvas */}
          <AnimatePresence>
            {toolsOpen && (
              <motion.div
                key="tools-panel"
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="absolute left-4 top-4 bottom-4 w-[220px] z-20
                           bg-zinc-950/95 border border-white/10 rounded-3xl
                           shadow-[4px_0_24px_rgba(31,41,55,0.12)] backdrop-blur-xl
                           flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Herramientas</p>
                  <button onClick={() => setToolsOpen(false)}
                    className="text-gray-600 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <DesignTools
                    manualSync={manualSync}
                    frontCanvas={frontCanvas}
                    backCanvas={backCanvas}
                    productRef={productModel.id}
                    surfaces={surfaces}
                    productModels={productModels}
                    productModel={productModel}
                    onProjectLoad={handleProjectLoad}
                    cartEnabled={isTshirt}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════
          MOBILE
          Layout: canvas 2D + 3D visibles, hamburguesa para herramientas
          ══════════════════════════════════════ */}
      {!isDesktop && (
      <div className="flex flex-col h-full overflow-hidden relative z-0">

        {/* Header mobile */}
        <div className="flex flex-col gap-2 px-4 py-2.5
                        border-b border-white/8 bg-surface/60 backdrop-blur-xl flex-shrink-0 z-10">
          <div className="flex items-center justify-between gap-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="font-black text-sm">Diseñador universal</span>
              <select
                value={productModel.id}
                onChange={(event) => handleProductChange(event.target.value)}
                className="max-w-[65vw] rounded-lg border border-[#e2e4ed] bg-white px-2 py-1 text-xs text-gray-800"
                aria-label="Producto"
              >
                {productModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className={`rounded-xl p-2 transition ${menuOpen ? "bg-primary text-background" : "glass-panel text-gray-800"}`}
              aria-label={menuOpen ? "Cerrar herramientas" : "Abrir herramientas"}
            >
              <span className="material-symbols-outlined text-[22px]">{menuOpen ? "close" : "tune"}</span>
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {surfaces.map((surface, index) => (
              <button
                key={`${surface.id}-${canvasGeneration}`}
                onClick={() => handleSurfaceChange(surface, index)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${
                  selectedSurface.id === surface.id
                    ? "border-[#75d4e1] bg-[#d9d4f2] text-gray-900"
                    : "border-[#e2e4ed] bg-white text-gray-600"
                }`}
              >
                {surface.label || surface.id}
              </button>
            ))}
          </div>
          {colorOptions.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              Color
              <select
                value={tshirtColor}
                onChange={(event) => handleProductColorChange(event.target.value)}
                className="rounded-lg border border-[#e2e4ed] bg-white px-2 py-1"
                aria-label="Color del producto"
              >
                {colorOptions.map((color) => (
                  <option key={color.value} value={color.value}>{color.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {modelsError && (
          <p role="status" className="mx-3 mt-2 rounded-lg border border-[#e2e4ed] bg-white px-3 py-2 text-[11px] text-gray-700">
            {modelsError} El editor de remeras sigue disponible.
          </p>
        )}

        {/* Canvas 2D + 3D siempre montados para mantener sincronización
            NOTE: "isolate z-0" crea un stacking context propio para cada canvas.
            Sin esto, en mobile los canvas (WebGL/Fabric) son promovidos por la GPU
            y se dibujan POR ENCIMA del carrito aunque este sea fixed z-9999. */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas 2D */}
          <div className="canvas-viewport flex-1 flex items-center justify-center p-3 min-h-0 relative z-0 isolate">
            {surfaces.length === 0 && (
              <p role="status" className="max-w-sm rounded-xl border border-[#e2e4ed] bg-white p-4 text-center text-xs text-gray-700">
                Este modelo no informa superficies imprimibles físicas. No se mostrarán guías hasta que el catálogo las defina.
              </p>
            )}
            {surfaces.map((surface, index) => (
              <div
                key={surface.id}
                className={`glass-panel rounded-2xl overflow-hidden border border-white/8 ${
                  selectedSurface.id === surface.id ? "block" : "hidden"
                }`}
              >
                <TshirtCanvas
                  svgPath={index === 1
                    ? TSHIRT_TYPES[selectedType]?.backPath || TSHIRT_TYPES["crew-neck"].backPath
                    : TSHIRT_TYPES[selectedType]?.frontPath || TSHIRT_TYPES["crew-neck"].frontPath}
                  view={index === 1 ? "back" : "front"}
                  model={productModel}
                  surface={surface}
                  initialDesign={sourceDesign}
                  onLoadError={reportCanvasError}
                />
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center py-1 flex-shrink-0">
            <div className="flex items-center gap-2 text-[10px] text-gray-700 font-bold uppercase">
              <div className="w-8 h-px bg-white/10" />
              <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
              <div className="w-8 h-px bg-white/10" />
            </div>
          </div>

          {/* Modelo 3D — isolate evita que el canvas WebGL tape el carrito en mobile */}
          <div className="flex-[0.7] min-h-0 relative z-0 isolate">
            <ProductPreview
              model={productModel}
              tshirtColor={tshirtColor}
              frontTexture={designTextureFront}
              backTexture={designTextureBack}
              selectedTexture={selectedTexture}
              onViewChange={handleViewChange}
            />
          </div>
        </div>

        {/* Botón flotante agregar al carrito */}
        {!menuOpen && isTshirt && (
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
          >
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("studio:addToCart"))}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm
                         uppercase tracking-wider bg-primary text-background neon-glow-sm
                         shadow-[0_8px_24px_rgba(0,242,255,0.3)] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              Agregar al carrito
            </button>
          </motion.div>
        )}

        {/* Menú hamburguesa — sheet desde abajo */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div key="overlay"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setMenuOpen(false)}
                className="absolute inset-0 bg-black/50 z-20"
              />
              <motion.div key="sheet"
                initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
                transition={{ type:"spring", damping:30, stiffness:300 }}
                className="absolute bottom-0 left-0 right-0 z-30
                           bg-zinc-950 border-t border-white/10 rounded-t-3xl
                           shadow-[0_-8px_40px_rgba(0,0,0,0.6)]"
                style={{ maxHeight:"60vh" }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Contenido scrolleable */}
                <div className="overflow-y-auto px-4 pb-6"
                     style={{ maxHeight:"calc(60vh - 48px)" }}>
                  <DesignTools
                    manualSync={manualSync}
                    frontCanvas={frontCanvas}
                    backCanvas={backCanvas}
                    productRef={productModel.id}
                    surfaces={surfaces}
                    productModels={productModels}
                    productModel={productModel}
                    onProjectLoad={handleProjectLoad}
                    cartEnabled={isTshirt}
                    onDone={() => setMenuOpen(false)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Modal de talle — siempre montado, portal a document.body */}
      {isTshirt && <SizeSelectorModal frontCanvas={frontCanvas} backCanvas={backCanvas} />}
    </div>
  );
}

export default function Disenar() {
  return (
    <>
      <div className="sr-only"><h1>ANATHEL Design Studio</h1></div>
      <Provider store={designerStore}>
        <CanvasProvider>
          <DesignerContent />
          <StudioOnboarding />
        </CanvasProvider>
      </Provider>
    </>
  );
}
