import { Suspense, useState } from "react";
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

  // Desktop: sidebar abierto/cerrado
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Mobile: bottom sheet abierto/cerrado
  const [sheetOpen, setSheetOpen]     = useState(false);
  // Mobile: tab activo (canvas 2D o modelo 3D)
  const [mobileTab, setMobileTab]     = useState("canvas");

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

      {/* ════════════════════════════════════════
          DESKTOP LAYOUT
          ════════════════════════════════════════ */}
      <div className="hidden md:flex h-full overflow-hidden">

        {/* Sidebar herramientas */}
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

        {/* Área principal desktop */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header desktop */}
          <div className="flex items-center justify-between px-5 py-3
                          border-b border-white/8 bg-surface/40 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen((v) => !v)}
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
            {/* Toggle frente/dorso */}
            <div className="flex items-center gap-1 glass-panel rounded-full p-1">
              {["front","back"].map((v) => (
                <button key={v} onClick={() => handleViewChange(v)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider
                              transition-all duration-200 ${
                    selectedView === v ? "bg-primary text-background" : "text-gray-500 hover:text-white"
                  }`}>
                  {v === "front" ? "Frente" : "Dorso"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 hidden lg:block">
              <span className="material-symbols-outlined text-[12px] mr-1">touch_app</span>
              Clic en el 3D para cambiar vista
            </p>
          </div>

          {/* Área de trabajo desktop */}
          <div className="flex-1 flex flex-row items-center justify-around gap-6 p-6 overflow-auto">
            {/* 3D */}
            <div className="relative flex-1 h-[480px] min-w-[280px]">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-[60px] pointer-events-none" />
              <div className="relative h-full glass-panel rounded-3xl overflow-hidden">
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
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
            {/* Canvas 2D */}
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

      {/* ════════════════════════════════════════
          MOBILE LAYOUT
          ════════════════════════════════════════ */}
      <div className="flex md:hidden flex-col h-full overflow-hidden">

        {/* Header mobile compacto */}
        <div className="flex items-center justify-between px-4 py-2.5
                        border-b border-white/8 bg-surface/60 backdrop-blur-xl flex-shrink-0">
          <p className="font-black text-sm">Design <span className="text-primary">Studio</span></p>

          {/* Tabs 3D / Canvas */}
          <div className="flex items-center gap-1 glass-panel rounded-full p-1">
            <button onClick={() => setMobileTab("canvas")}
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                mobileTab === "canvas" ? "bg-primary text-background" : "text-gray-500"
              }`}>
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
            <button onClick={() => setMobileTab("3d")}
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                mobileTab === "3d" ? "bg-primary text-background" : "text-gray-500"
              }`}>
              <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
            </button>
          </div>

          {/* Toggle frente/dorso */}
          <div className="flex items-center gap-1 glass-panel rounded-full p-0.5">
            {["front","back"].map((v) => (
              <button key={v} onClick={() => handleViewChange(v)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                  selectedView === v ? "bg-primary text-background" : "text-gray-500"
                }`}>
                {v === "front" ? "F" : "D"}
              </button>
            ))}
          </div>
        </div>

        {/* Área principal mobile */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {mobileTab === "canvas" ? (
              /* Canvas 2D centrado */
              <motion.div key="canvas"
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
                className="absolute inset-0 flex items-center justify-center p-4"
              >
                <div className="glass-panel rounded-2xl overflow-hidden border border-white/8"
                     style={{ maxWidth: "100%", maxHeight: "100%" }}>
                  <TshirtCanvas svgPath={svgPath} view={selectedView} />
                </div>
              </motion.div>
            ) : (
              /* Modelo 3D */
              <motion.div key="3d"
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
                className="absolute inset-0"
              >
                <Canvas camera={{ position:[0,0,5], fov:45 }}>
                  <OrbitControls maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} enableZoom={false} autoRotate autoRotateSpeed={1} />
                  <Suspense fallback={null}>
                    <TshirtModel tshirtColor={tshirtColor} designTexture={designTextureFront} designTextureBack={designTextureBack} onViewChange={handleViewChange} />
                    <Environment preset="sunset" />
                  </Suspense>
                </Canvas>
                <Loader containerStyles={{ position:"absolute", inset:0, background:"rgba(10,10,11,0.85)" }}
                  dataStyles={{ color:"#00f2ff", fontSize:"12px" }} barStyles={{ backgroundColor:"#00f2ff", height:"2px" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Barra inferior mobile con herramientas */}
        <div className="flex-shrink-0 border-t border-white/8 bg-surface/80 backdrop-blur-xl">

          {/* Bottom sheet expandible */}
          <AnimatePresence>
            {sheetOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-4 py-4 max-h-[45vh] overflow-y-auto">
                  <DesignTools
                    manualSync={manualSync}
                    frontCanvas={frontCanvas}
                    backCanvas={backCanvas}
                    onDone={() => setSheetOpen(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toolbar fija */}
          <div className="flex items-center justify-between px-4 py-3">
            {/* Botón herramientas */}
            <button onClick={() => setSheetOpen((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs
                          uppercase tracking-wider transition-all duration-200 ${
                sheetOpen
                  ? "bg-primary text-background"
                  : "glass-panel text-white border border-white/10"
              }`}>
              <span className="material-symbols-outlined text-[18px]">
                {sheetOpen ? "keyboard_arrow_down" : "tune"}
              </span>
              {sheetOpen ? "Cerrar" : "Herramientas"}
            </button>

            {/* Acciones rápidas: color actual */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-primary/50"
                   style={{ backgroundColor: tshirtColor }} />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Color</span>
            </div>

            {/* Botón agregar al carrito */}
            <button
              onClick={() => {
                setSheetOpen(false);
                // Dispara el modal de talle en DesignTools
                document.dispatchEvent(new CustomEvent("studio:addToCart"));
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs
                         uppercase tracking-wider bg-tertiary text-background
                         transition-all duration-200 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
              Agregar
            </button>
          </div>
        </div>
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
