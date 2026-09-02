import { Suspense, useState, useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Loader } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";

import designerStore                 from "../designer/store/designerStore.js";
import { setSelectedView }           from "../designer/store/designerSlice.js";
import { CanvasProvider, useCanvas } from "../designer/hooks/useCanvas.jsx";
import { useCanvasTextureSync }      from "../designer/hooks/useCanvasTextureSync.jsx";
import { TshirtModel }               from "../designer/components/TshirtModel.jsx";
import TshirtCanvas                  from "../designer/components/TshirtCanvas.jsx";
import DesignTools                   from "../designer/components/DesignTools.jsx";
import SizeSelectorModal             from "../designer/components/SizeSelectorModal.jsx";
import { TSHIRT_TYPES }              from "../designer/constants/designConstants.js";
import StudioOnboarding              from "../components/StudioOnboarding.jsx";

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
  const { frontCanvas, backCanvas } = useCanvas();

  const [toolsOpen, setToolsOpen] = useState(false); // desktop: panel herramientas
  const [menuOpen, setMenuOpen]   = useState(false);  // mobile: hamburguesa

  const { designTextureFront, designTextureBack, manualTriggerSync } =
    useCanvasTextureSync({ frontCanvas, backCanvas, selectedView });

  const manualSync = () => manualTriggerSync(selectedView);

  // Modal de talle — montado SIEMPRE a nivel de página (fuera de paneles con
  // overflow/transform) para que quede adelante del 3D y nunca quede inaccesible.
  // Tanto el botón flotante mobile como el panel de herramientas disparan "studio:addToCart".

  const handleViewChange = (view) => {
    if (view !== selectedView) dispatch(setSelectedView(view));
  };

  return (
    <div className="bg-background" style={{ height: "calc(100dvh - 64px)" }}>

      {/* ══════════════════════════════════════
          DESKTOP
          Layout: [3D grande] [Canvas 2D] [panel tools flotante]
          ══════════════════════════════════════ */}
      {!isDesktop ? null : (
      <div className="flex flex-col h-full overflow-hidden relative z-0">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3
                        border-b border-white/8 bg-surface/40 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-black text-sm">Design <span className="text-primary">Studio</span></p>
              <p className="text-[10px] text-gray-600">Diseñá tu remera en tiempo real</p>
            </div>
          </div>

          {/* Toggle frente/dorso */}
          <div className="flex items-center gap-1 glass-panel rounded-full p-1">
            {["front","back"].map(v => (
              <button key={v} onClick={() => handleViewChange(v)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  selectedView === v ? "bg-primary text-background" : "text-gray-500 hover:text-white"
                }`}>
                {v === "front" ? "Frente" : "Dorso"}
              </button>
            ))}
          </div>

          {/* Botón herramientas */}
          <button
            onClick={() => setToolsOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              toolsOpen ? "bg-primary text-background" : "glass-panel text-white border border-white/10 hover:border-primary/50"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            {toolsOpen ? "Cerrar" : "Herramientas"}
          </button>
        </div>

        {/* Área de trabajo */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* 3D — ocupa la mayor parte (isolate confina el canvas WebGL a su stacking context) */}
          <div className="flex-1 relative p-4 isolate z-0">
            <div className="absolute inset-4 rounded-3xl bg-primary/5 blur-[60px] pointer-events-none" />
            <div className="relative h-full glass-panel rounded-3xl overflow-hidden">
              <Canvas camera={{ position:[0,0,5], fov:45 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 5, 5]} intensity={1.2} />
                <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#ffd9a0" />
                <pointLight position={[-5, -5, -5]} color="#00f2ff" intensity={0.6} />
                <OrbitControls maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} enableZoom={false} autoRotate autoRotateSpeed={0.5} />
                <Suspense fallback={null}>
                  <TshirtModel tshirtColor={tshirtColor} designTexture={designTextureFront} designTextureBack={designTextureBack} onViewChange={handleViewChange} />
                </Suspense>
              </Canvas>
              <Loader containerStyles={{ position:"absolute", inset:0, background:"rgba(10,10,11,0.85)", borderRadius:"1.5rem" }}
                dataStyles={{ color:"#00f2ff", fontSize:"12px" }} barStyles={{ backgroundColor:"#00f2ff", height:"2px" }} />
            </div>
            <p className="text-center text-[11px] text-gray-600 mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[13px]">360</span>Arrastrá para rotar
            </p>
          </div>

          {/* Canvas 2D — siempre montados ambos, solo uno visible */}
          <div className="flex flex-col items-center justify-center gap-3 p-4 flex-shrink-0 isolate z-0 relative">
            {/* Frente — siempre montado */}
            <div className={selectedView === "front" ? "block" : "hidden"}>
              <div className="glass-panel rounded-3xl overflow-hidden border border-white/8">
                <TshirtCanvas svgPath={TSHIRT_TYPES[selectedType]?.frontPath || TSHIRT_TYPES["crew-neck"].frontPath} view="front" />
              </div>
            </div>
            {/* Dorso — siempre montado */}
            <div className={selectedView === "back" ? "block" : "hidden"}>
              <div className="glass-panel rounded-3xl overflow-hidden border border-white/8">
                <TshirtCanvas svgPath={TSHIRT_TYPES[selectedType]?.backPath || TSHIRT_TYPES["crew-neck"].backPath} view="back" />
              </div>
            </div>
            <p className="text-[11px] text-gray-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">edit</span>
              Editá el diseño en el canvas
            </p>
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
                           shadow-[4px_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl
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
                  <DesignTools manualSync={manualSync} frontCanvas={frontCanvas} backCanvas={backCanvas} />
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
        <div className="flex items-center justify-between px-4 py-2.5
                        border-b border-white/8 bg-surface/60 backdrop-blur-xl flex-shrink-0 z-10">
          <p className="font-black text-sm">Design <span className="text-primary">Studio</span></p>

          <div className="flex items-center gap-1 glass-panel rounded-full p-0.5">
            {["front","back"].map(v => (
              <button key={v} onClick={() => handleViewChange(v)}
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase transition-all ${
                  selectedView === v ? "bg-primary text-background" : "text-gray-500"
                }`}>
                {v === "front" ? "Frente" : "Dorso"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`p-2 rounded-xl transition-all ${
              menuOpen ? "bg-primary text-background" : "glass-panel text-white border border-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {menuOpen ? "close" : "tune"}
            </span>
          </button>
        </div>

        {/* Canvas 2D + 3D siempre montados para mantener sincronización
            NOTE: "isolate z-0" crea un stacking context propio para cada canvas.
            Sin esto, en mobile los canvas (WebGL/Fabric) son promovidos por la GPU
            y se dibujan POR ENCIMA del carrito aunque este sea fixed z-9999. */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas 2D — ambos siempre montados, solo uno visible */}
          <div className="flex-1 flex items-center justify-center p-3 min-h-0 relative z-0 isolate">
            <div className={`glass-panel rounded-2xl overflow-hidden border border-white/8 h-full flex items-center justify-center ${selectedView === "front" ? "block" : "hidden"}`}>
              <TshirtCanvas svgPath={TSHIRT_TYPES[selectedType]?.frontPath || TSHIRT_TYPES["crew-neck"].frontPath} view="front" />
            </div>
            <div className={`glass-panel rounded-2xl overflow-hidden border border-white/8 h-full flex items-center justify-center ${selectedView === "back" ? "block" : "hidden"}`}>
              <TshirtCanvas svgPath={TSHIRT_TYPES[selectedType]?.backPath || TSHIRT_TYPES["crew-neck"].backPath} view="back" />
            </div>
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
            <Canvas camera={{ position:[0,0,5], fov:50 }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} />
              <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#ffd9a0" />
              <pointLight position={[-5, -5, -5]} color="#00f2ff" intensity={0.6} />
              <OrbitControls maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} enableZoom={false} autoRotate autoRotateSpeed={1.5} />
              <Suspense fallback={null}>
                <TshirtModel tshirtColor={tshirtColor} designTexture={designTextureFront} designTextureBack={designTextureBack} onViewChange={handleViewChange} />
              </Suspense>
            </Canvas>
          </div>
        </div>

        {/* Botón flotante agregar al carrito */}
        {!menuOpen && (
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
      <SizeSelectorModal frontCanvas={frontCanvas} backCanvas={backCanvas} />
    </div>
  );
}

export default function Disenar() {
  return (
    <>
      <div className="sr-only"><h1>NEON-STITCH Design Studio</h1></div>
      <Provider store={designerStore}>
        <CanvasProvider>
          <DesignerContent />
          <StudioOnboarding />
        </CanvasProvider>
      </Provider>
    </>
  );
}
