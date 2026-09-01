import { Suspense, useState, useRef } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, Loader } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";

import designerStore                 from "../designer/store/designerStore.js";
import { setSelectedView }           from "../designer/store/designerSlice.js";
import { CanvasProvider, useCanvas } from "../designer/hooks/useCanvas.jsx";
import { useCanvasTextureSync }      from "../designer/hooks/useCanvasTextureSync.jsx";
import { TshirtModel }               from "../designer/components/TshirtModel.jsx";
import TshirtCanvas                  from "../designer/components/TshirtCanvas.jsx";
import DesignTools                   from "../designer/components/DesignTools.jsx";
import { TSHIRT_TYPES }              from "../designer/constants/designConstants.js";
import StudioOnboarding              from "../components/StudioOnboarding.jsx";

function DesignerContent() {
  const dispatch     = useDispatch();
  const tshirtColor  = useSelector((s) => s.designer.tshirtColor);
  const selectedView = useSelector((s) => s.designer.selectedView);
  const selectedType = useSelector((s) => s.designer.selectedType);
  const { frontCanvas, backCanvas } = useCanvas();

  const [sidebarOpen, setSidebarOpen] = useState(true);  // desktop
  const [menuOpen, setMenuOpen]       = useState(false);  // mobile hamburguesa
  const [menuTab, setMenuTab]         = useState("tools"); // tools | library

  const { designTextureFront, designTextureBack, manualTriggerSync } =
    useCanvasTextureSync({ frontCanvas, backCanvas, selectedView });

  const tshirtType = TSHIRT_TYPES[selectedType] || TSHIRT_TYPES["crew-neck"];
  const svgPath    = selectedView === "front" ? tshirtType.frontPath : tshirtType.backPath;
  const manualSync = () => manualTriggerSync(selectedView);

  const handleViewChange = (view) => {
    if (view !== selectedView) dispatch(setSelectedView(view));
  };

  return (
    <div className="bg-background" style={{ height: "calc(100dvh - 64px)" }}>

      {/* ══════════════ DESKTOP ══════════════ */}
      <div className="hidden md:flex h-full overflow-hidden">

        {/* Sidebar */}
        <motion.aside
          animate={{ width: sidebarOpen ? 210 : 0, opacity: sidebarOpen ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0 overflow-hidden border-r border-white/8 bg-surface/60"
        >
          <div className="w-[210px] h-full p-4 flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">
              Herramientas
            </p>
            <DesignTools manualSync={manualSync} frontCanvas={frontCanvas} backCanvas={backCanvas} />
          </div>
        </motion.aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header desktop */}
          <div className="flex items-center justify-between px-5 py-3
                          border-b border-white/8 bg-surface/40 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(v => !v)}
                className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">
                  {sidebarOpen ? "left_panel_close" : "left_panel_open"}
                </span>
              </button>
              <div>
                <p className="font-black text-sm">Design <span className="text-primary">Studio</span></p>
                <p className="text-[10px] text-gray-600">Diseñá tu remera en tiempo real</p>
              </div>
            </div>
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
            <p className="text-[10px] text-gray-600 hidden lg:flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">touch_app</span>
              Clic en el 3D para cambiar vista
            </p>
          </div>

          {/* Área trabajo desktop */}
          <div className="flex-1 flex flex-row items-center justify-around gap-6 p-6 overflow-auto">
            <div className="relative flex-1 h-[480px] min-w-[280px]">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-[60px] pointer-events-none" />
              <div className="relative h-full glass-panel rounded-3xl overflow-hidden">
                <Canvas camera={{ position:[0,0,5], fov:45 }}>
                  <OrbitControls maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} enableZoom={false} autoRotate autoRotateSpeed={0.5} />
                  <Suspense fallback={null}>
                    <TshirtModel tshirtColor={tshirtColor} designTexture={designTextureFront} designTextureBack={designTextureBack} onViewChange={handleViewChange} />
                    <Environment preset="sunset" />
                  </Suspense>
                </Canvas>
                <Loader containerStyles={{ position:"absolute", inset:0, background:"rgba(10,10,11,0.85)", borderRadius:"1.5rem" }}
                  dataStyles={{ color:"#00f2ff", fontSize:"12px" }} barStyles={{ backgroundColor:"#00f2ff", height:"2px" }} />
              </div>
              <p className="text-center text-[11px] text-gray-600 mt-2 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">360</span>Arrastrá para rotar
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="glass-panel rounded-3xl overflow-hidden p-2 border border-white/8">
                <TshirtCanvas svgPath={svgPath} view={selectedView} />
              </div>
              <p className="text-[11px] text-gray-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">edit</span>
                Editá el diseño en el canvas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ MOBILE ══════════════ */}
      <div className="flex md:hidden flex-col h-full overflow-hidden relative">

        {/* Header mobile */}
        <div className="flex items-center justify-between px-4 py-2.5
                        border-b border-white/8 bg-surface/60 backdrop-blur-xl flex-shrink-0 z-10">
          <p className="font-black text-sm">Design <span className="text-primary">Studio</span></p>

          {/* Toggle frente/dorso */}
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

          {/* Hamburguesa */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`p-2 rounded-xl transition-all duration-200 ${
              menuOpen
                ? "bg-primary text-background"
                : "glass-panel text-white border border-white/10"
            }`}
            aria-label="Menú herramientas"
          >
            <span className="material-symbols-outlined text-[22px]">
              {menuOpen ? "close" : "tune"}
            </span>
          </button>
        </div>

        {/* Área principal mobile — canvas 2D arriba, 3D abajo */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Canvas 2D — siempre montado para mantener la sincronización */}
          <div className={`flex items-center justify-center p-3 transition-all duration-300 ${
            menuOpen ? "flex-[0.6]" : "flex-[1.2]"
          }`}>
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/8 h-full flex items-center justify-center">
              <TshirtCanvas svgPath={svgPath} view={selectedView} />
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center justify-center py-1 flex-shrink-0">
            <div className="flex items-center gap-2 text-[10px] text-gray-700 font-bold uppercase tracking-wider">
              <div className="w-8 h-px bg-white/10" />
              <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
              Vista 3D
              <div className="w-8 h-px bg-white/10" />
            </div>
          </div>

          {/* Modelo 3D — siempre montado */}
          <div className={`transition-all duration-300 ${
            menuOpen ? "flex-[0.4]" : "flex-[0.8]"
          }`}>
            <Canvas camera={{ position:[0,0,5], fov:50 }}>
              <OrbitControls maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} enableZoom={false} autoRotate autoRotateSpeed={1.5} />
              <Suspense fallback={null}>
                <TshirtModel tshirtColor={tshirtColor} designTexture={designTextureFront} designTextureBack={designTextureBack} onViewChange={handleViewChange} />
                <Environment preset="sunset" />
              </Suspense>
            </Canvas>
          </div>
        </div>

        {/* ── Menú hamburguesa (sheet desde abajo) ── */}
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Overlay tenue — no tapa el canvas */}
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
                className="absolute inset-0 bg-black/40 z-20"
              />

              {/* Sheet */}
              <motion.div
                key="sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 z-30
                           bg-zinc-950 border-t border-white/10 rounded-t-3xl
                           shadow-[0_-8px_40px_rgba(0,0,0,0.6)]"
                style={{ maxHeight: "55vh" }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Tabs herramientas / biblioteca */}
                <div className="flex gap-2 px-4 pb-3">
                  <button
                    onClick={() => setMenuTab("tools")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black
                                uppercase tracking-wider transition-all ${
                      menuTab === "tools"
                        ? "bg-primary text-background"
                        : "glass-panel text-gray-400 border border-white/10 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">build</span>
                    Herramientas
                  </button>
                  <button
                    onClick={() => setMenuTab("library")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black
                                uppercase tracking-wider transition-all ${
                      menuTab === "library"
                        ? "bg-secondary text-background"
                        : "glass-panel text-gray-400 border border-white/10 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    Biblioteca
                  </button>
                </div>

                {/* Contenido scrolleable */}
                <div className="overflow-y-auto px-4 pb-4"
                     style={{ maxHeight: "calc(55vh - 100px)" }}>
                  <DesignTools
                    manualSync={manualSync}
                    frontCanvas={frontCanvas}
                    backCanvas={backCanvas}
                    initialTab={menuTab}
                    onDone={() => setMenuOpen(false)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Botón flotante "Agregar al carrito" */}
        {!menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
      </div>
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
