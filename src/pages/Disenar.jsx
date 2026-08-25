import { Suspense, useState } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, Loader } from "@react-three/drei";
import { motion } from "framer-motion";

import designerStore            from "../designer/store/designerStore.js";
import { setSelectedView }      from "../designer/store/designerSlice.js";
import { CanvasProvider, useCanvas } from "../designer/hooks/useCanvas.jsx";
import { useCanvasTextureSync } from "../designer/hooks/useCanvasTextureSync.jsx";
import { TshirtModel }          from "../designer/components/TshirtModel.jsx";
import TshirtCanvas             from "../designer/components/TshirtCanvas.jsx";
import DesignTools              from "../designer/components/DesignTools.jsx";
import { TSHIRT_TYPES }         from "../designer/constants/designConstants.js";

// ── Contenido interno (necesita acceso a Redux y CanvasContext) ──────────────
function DesignerContent() {
  const dispatch        = useDispatch();
  const tshirtColor     = useSelector((s) => s.designer.tshirtColor);
  const selectedView    = useSelector((s) => s.designer.selectedView);
  const selectedType    = useSelector((s) => s.designer.selectedType);
  const { frontCanvas, backCanvas } = useCanvas();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { designTextureFront, designTextureBack, manualTriggerSync } =
    useCanvasTextureSync({ frontCanvas, backCanvas, selectedView });

  const tshirtType = TSHIRT_TYPES[selectedType] || TSHIRT_TYPES["crew-neck"];
  const svgPath    = selectedView === "front" ? tshirtType.frontPath : tshirtType.backPath;

  const handleViewChange = (view) => {
    if (view !== selectedView) dispatch(setSelectedView(view));
  };

  const manualSync = () => manualTriggerSync(selectedView);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden">

      {/* ── Sidebar de herramientas ── */}
      <motion.aside
        animate={{ width: sidebarOpen ? 200 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="flex-shrink-0 overflow-hidden border-r border-white/8 bg-surface/60"
      >
        <div className="w-[200px] h-full p-4 flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
            Herramientas
          </p>
          <DesignTools manualSync={manualSync} />
        </div>
      </motion.aside>

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header del studio */}
        <div className="flex items-center justify-between px-5 py-3
                        border-b border-white/8 bg-surface/40 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar */}
            <button onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-white/5
                         transition-colors hidden md:flex">
              <span className="material-symbols-outlined text-[20px]">
                {sidebarOpen ? "left_panel_close" : "left_panel_open"}
              </span>
            </button>
            <div>
              <p className="font-black text-sm tracking-tight">
                Design <span className="text-primary">Studio</span>
              </p>
              <p className="text-[10px] text-gray-600">Diseñá tu remera en tiempo real</p>
            </div>
          </div>

          {/* Toggle frente / dorso */}
          <div className="flex items-center gap-1 glass-panel rounded-full p-1">
            {["front", "back"].map((v) => (
              <button key={v} onClick={() => handleViewChange(v)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider
                            transition-all duration-200 ${
                  selectedView === v
                    ? "bg-primary text-background"
                    : "text-gray-500 hover:text-white"
                }`}>
                {v === "front" ? "Frente" : "Dorso"}
              </button>
            ))}
          </div>

          {/* Instrucción */}
          <p className="text-[10px] text-gray-600 hidden lg:block">
            <span className="material-symbols-outlined text-[12px] mr-1">touch_app</span>
            Clic en el modelo 3D para cambiar de vista
          </p>
        </div>

        {/* ── Área de trabajo: 3D + Canvas 2D ── */}
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-around
                        gap-6 p-6 overflow-auto">

          {/* Vista 3D */}
          <div className="relative w-full max-w-[340px] lg:max-w-none lg:flex-1
                          h-[360px] lg:h-[520px]">
            <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-[60px]
                            pointer-events-none" />
            <div className="relative h-full glass-panel rounded-3xl overflow-hidden">
              <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <OrbitControls
                  maxPolarAngle={Math.PI / 2}
                  minPolarAngle={Math.PI / 3}
                  enableZoom={false}
                />
                <Suspense fallback={null}>
                  <TshirtModel
                    tshirtColor={tshirtColor}
                    designTexture={designTextureFront}
                    designTextureBack={designTextureBack}
                    onViewChange={handleViewChange}
                  />
                  <Environment preset="sunset" />
                </Suspense>
              </Canvas>
              <Loader
                containerStyles={{
                  position: "absolute", inset: 0,
                  background: "rgba(10,10,11,0.85)",
                  borderRadius: "1.5rem",
                }}
                dataStyles={{ color: "#00f2ff", fontSize: "12px" }}
                barStyles={{ backgroundColor: "#00f2ff", height: "2px" }}
              />
            </div>
            <p className="text-center text-[11px] text-gray-600 mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[13px]">360</span>
              Arrastrá para rotar
            </p>
          </div>

          {/* Canvas 2D */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="glass-panel rounded-3xl overflow-hidden p-2 border border-white/8">
              <TshirtCanvas svgPath={svgPath} view={selectedView} />
            </div>
            <p className="text-[11px] text-gray-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">edit</span>
              Editá el diseño directamente en el canvas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página pública: envuelve todo con los providers necesarios ────────────────
export default function Disenar() {
  return (
    <>
      {/* Meta info de la página */}
      <div className="sr-only">
        <h1>NEON-STITCH Design Studio — Diseñá tu remera</h1>
      </div>

      {/* Providers aislados del resto de la app */}
      <Provider store={designerStore}>
        <CanvasProvider>
          <DesignerContent />
        </CanvasProvider>
      </Provider>
    </>
  );
}
