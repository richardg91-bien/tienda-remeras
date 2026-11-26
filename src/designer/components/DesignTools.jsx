import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import * as fabric from "fabric";
import { setTshirtColor } from "../store/designerSlice.js";
import { useCanvas } from "../hooks/useCanvas.jsx";
import canvasStorageManager from "../utils/canvasStorageManager.js";
import AssetLibrary from "./AssetLibrary.jsx";
import ProjectManager from "./ProjectManager.jsx";
import { uploadPrivateDesignAsset } from "../utils/designerApi.js";
import {
  DEFAULT_TEXT_CONFIG,
  TSHIRT_COLOR_CODES, FONT_OPTIONS,
} from "../constants/designConstants.js";

const TABS = [
  { id: "tools",   icon: "build",         label: "Herramientas" },
  { id: "library", icon: "photo_library",  label: "Biblioteca"  },
  { id: "projects",icon: "folder_open",   label: "Proyectos"    },
  { id: "cart",    icon: "shopping_cart",  label: "Carrito"     },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function DesignTools({
  manualSync,
  frontCanvas,
  backCanvas,
  initialTab,
  productRef = "tee-classic",
  surfaces = [],
  productModels = [],
  productModel,
  onProjectLoad,
  cartEnabled = true,
}) {
  const [activeTab, setActiveTab]        = useState(initialTab === "library" ? "library" : "tools");
  const [addedOk, setAddedOk]            = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const currentTab = !cartEnabled && activeTab === "cart" ? "tools" : activeTab;

  // El modal de talle vive en SizeSelectorModal (montado a nivel de página).
  // Este botón solo dispara el evento global; escucha la confirmación para el feedback visual.
  useEffect(() => {
    const okHandler = () => {
      setAddedOk(true);
      setTimeout(() => setAddedOk(false), 1600);
    };
    document.addEventListener("studio:addedToCart", okHandler);
    return () => document.removeEventListener("studio:addedToCart", okHandler);
  }, []);

  const dispatch    = useDispatch();
  const tshirtColor = useSelector((s) => s.designer.tshirtColor);
  const { activeCanvas, selectedObject, setSelectedObject } = useCanvas();

  const [textProps, setTextProps] = useState({
    text: "", color: "#1f2937", font: "arial", fontSize: 20,
  });

  // ── Acciones sobre el canvas ──────────────────────────
  const addText = () => {
    if (!activeCanvas) return;
    const text = new fabric.Textbox("Tu texto aquí", {
      ...DEFAULT_TEXT_CONFIG,
      left: activeCanvas.width  / 2,
      top:  activeCanvas.height / 2,
      width: 200,
    });
    activeCanvas.add(text);
    activeCanvas.setActiveObject(text);
    activeCanvas.renderAll();
    manualSync?.();
    setTextProps({ text: "Tu texto aquí", color: DEFAULT_TEXT_CONFIG.fill, font: "arial", fontSize: 20 });
  };

  const addUploadedImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadMessage("Elegí un archivo de imagen válido.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadMessage("La imagen debe pesar menos de 8 MB.");
      return;
    }
    if (!activeCanvas) {
      setUploadMessage("El canvas todavía se está preparando. Volvé a intentar.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    try {
      const source = await optimizeImage(file);
      let privateAssetPath = "";
      if (localStorage.getItem("accessToken")) {
        try {
          const asset = await uploadPrivateDesignAsset(file);
          privateAssetPath = asset.path;
        } catch (error) {
          setUploadMessage(`La imagen se agregó, pero no se pudo respaldar en tu biblioteca privada: ${error.message}`);
        }
      } else {
        setUploadMessage("Imagen agregada en este dispositivo. Iniciá sesión para respaldarla en tu biblioteca privada.");
      }

      const image = await fabric.Image.fromURL(source);
      const scale = Math.min(
        1,
        (activeCanvas.width * 0.6) / image.width,
        (activeCanvas.height * 0.6) / image.height,
      );
      image.scale(scale);
      image.set({
        left: (activeCanvas.width - image.getScaledWidth()) / 2,
        top: (activeCanvas.height - image.getScaledHeight()) / 2,
        ...(privateAssetPath ? { privateAssetPath } : {}),
      });
      activeCanvas.add(image);
      activeCanvas.setActiveObject(image);
      activeCanvas.renderAll();
      manualSync?.();
    } catch (error) {
      setUploadMessage(`No se pudo agregar la imagen: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteSelected = () => {
    if (!activeCanvas || !selectedObject) return;
    activeCanvas.remove(selectedObject);
    activeCanvas.discardActiveObject();
    activeCanvas.renderAll();
    setSelectedObject(null);
    manualSync?.();
  };

  const clearAll = () => {
    // Limpia AMBOS canvas (frente y dorso), no solo el activo
    [frontCanvas, backCanvas].forEach((c) => {
      if (!c) return;
      c.discardActiveObject();
      // remove() en lugar de clear(): dispara object:removed → guarda [] en storage
      c.remove(...c.getObjects());
      c.renderAll();
    });
    setSelectedObject(null);
    surfaces.forEach((surface) => {
      canvasStorageManager.clearProductCanvasObjects(productRef, surface.id);
    });
    if (productRef === "tee-classic") canvasStorageManager.clearCanvasStorage("all");
    // Sincroniza el 3D de ambas caras con los canvas vacíos
    setTimeout(() => {
      manualSync?.("front");
      manualSync?.("back");
    }, 60);
  };

  const updateText = (key, value) => {
    if (!selectedObject || selectedObject.type !== "textbox" || !activeCanvas) return;
    setTextProps((p) => ({ ...p, [key]: value }));
    const prop = key === "color" ? "fill" : key === "font" ? "fontFamily" : key;
    selectedObject.set(prop, value);
    activeCanvas.renderAll();
    manualSync?.();
  };

  const isTextSelected = selectedObject?.type === "textbox";

  return (
    <>
      <div className="designer-tools flex flex-col h-full gap-3">

        {/* ── Selector de pestañas ── */}
        <div className="flex gap-1 glass-panel rounded-xl p-1 flex-shrink-0">
          {TABS.filter((tab) => cartEnabled || tab.id !== "cart").map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                          text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                currentTab === tab.id
                  ? "bg-primary text-background"
                  : "text-gray-500 hover:text-white"
              }`}>
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Pestaña: Herramientas ── */}
        {currentTab === "tools" && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">

            {/* Diseño */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
                Diseño
              </p>
              <div className="flex flex-col gap-2">
                <ToolBtn icon="title" label="Agregar texto" onClick={addText} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={addUploadedImage}
                  className="hidden"
                />
                <ToolBtn
                  icon={uploading ? "hourglass_top" : "upload"}
                  label={uploading ? "Cargando imagen…" : "Subir imagen propia"}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                />
                <button
                  onClick={() => setActiveTab("library")}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
                             text-xs font-bold uppercase tracking-wider transition-all duration-200
                             text-gray-300 hover:text-white border border-white/10 hover:border-primary/50
                             hover:bg-primary/5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_library</span>
                  Ir a biblioteca
                </button>
                {uploadMessage && <p role="status" className="text-[10px] leading-relaxed text-gray-600">{uploadMessage}</p>}
              </div>
            </div>

            {/* Color remera */}
            {cartEnabled && (
            <div className="border-t border-white/10 pt-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
                Color remera
              </p>
              <div className="flex flex-wrap gap-2">
                {TSHIRT_COLOR_CODES.map((c) => (
                  <button key={c.hex} onClick={() => dispatch(setTshirtColor(c.hex))} title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-150
                                hover:scale-110 relative group ${
                      tshirtColor === c.hex ? "border-primary scale-110" : "border-white/20"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {tshirtColor === c.hex && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[13px]"
                              style={{ color: ["#DEDFDC","#E8C6A6","#FDD107"].includes(c.hex) ? "#000" : "#fff" }}>
                          check
                        </span>
                      </span>
                    )}
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px]
                                     font-bold text-white bg-zinc-900 px-1.5 py-0.5 rounded
                                     opacity-0 group-hover:opacity-100 transition-opacity
                                     whitespace-nowrap pointer-events-none z-10">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Editar texto */}
            {isTextSelected && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary mb-3">
                  Editar texto
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Texto</label>
                    <input type="text" value={textProps.text} onChange={(e) => updateText("text", e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2
                                 text-sm text-white focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Fuente</label>
                    <select value={textProps.font} onChange={(e) => updateText("font", e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2
                                 text-sm text-white focus:outline-none focus:border-primary transition-colors cursor-pointer">
                      {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Tamaño</label>
                      <input type="number" min="8" max="120" value={textProps.fontSize}
                        onChange={(e) => updateText("fontSize", parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2
                                   text-sm text-white focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Color</label>
                      <input type="color" value={textProps.color}
                        onChange={(e) => updateText("color", e.target.value)}
                        className="w-full h-10 bg-zinc-900 border border-white/10 rounded-xl cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="border-t border-white/10 pt-3 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tertiary mb-2">
                Acciones
              </p>
              <div className="flex flex-col gap-2">
                {selectedObject && (
                  <ToolBtn icon="delete" label="Eliminar selección" onClick={deleteSelected}
                    className="border border-red-500/30 hover:border-red-500 text-red-400 hover:bg-red-500/10" />
                )}
                <ToolBtn icon="clear_all" label="Limpiar todo" onClick={clearAll}
                  className="border border-white/10 hover:border-red-500/50 text-gray-500 hover:text-red-400" />
              </div>
            </div>
          </div>
        )}

        {/* ── Pestaña: Biblioteca ── */}
        {currentTab === "library" && (
          <div className="flex-1 overflow-hidden">
            <AssetLibrary manualSync={manualSync} />
          </div>
        )}

        {currentTab === "projects" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <ProjectManager
              frontCanvas={frontCanvas}
              backCanvas={backCanvas}
              tshirtColor={tshirtColor}
              manualSync={manualSync}
              productModels={productModels}
              productModel={productModel}
              onProjectLoad={onProjectLoad}
            />
          </div>
        )}

        {/* ── Pestaña: Carrito (talle + agregar) ── */}
        {cartEnabled && currentTab === "cart" && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
            {/* Resumen del diseño */}
            <div className="flex items-center gap-3 p-3 glass-panel rounded-2xl flex-shrink-0">
              <div className="w-11 h-13 rounded-xl flex-shrink-0 border border-white/10
                              flex items-center justify-center"
                   style={{ backgroundColor: tshirtColor }}>
                <span className="material-symbols-outlined text-[20px] text-black/40">checkroom</span>
              </div>
              <div className="min-w-0">
                <p className="font-black text-xs">Remera Personalizada</p>
                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                  Color
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: tshirtColor }} />
                  · Tu diseño incluido
                </p>
                <p className="text-primary font-black text-sm mt-0.5">$15.000</p>
              </div>
            </div>

            {/* Talles — al elegir uno se abre el modal de confirmación */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
                Elegí tu talle
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((size) => (
                  <button key={size}
                    onClick={() => document.dispatchEvent(new CustomEvent("studio:addToCart", { detail: { size } }))}
                    className="py-3 rounded-xl font-black text-sm border border-white/15 text-gray-400
                               hover:border-primary/60 hover:text-white hover:bg-primary/5
                               active:scale-95 transition-all duration-150">
                    {size}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 text-center mt-2">
                Para look oversize elegí un talle más grande
              </p>
            </div>

            {/* Botón directo al modal */}
            <div className="mt-auto pt-3 border-t border-white/10">
              <button
                onClick={() => document.dispatchEvent(new CustomEvent("studio:addToCart"))}
                className="w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest
                           bg-primary/10 text-primary border border-primary/40
                           hover:bg-primary/20 active:scale-95 transition-all duration-200
                           flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">straighten</span>
                Guía de talles
              </button>
            </div>
          </div>
        )}

        {/* ── Botón principal: Agregar al carrito ── */}
        {cartEnabled ? <div className="flex-shrink-0 pt-2 border-t border-white/10">
          <motion.button
            onClick={() => document.dispatchEvent(new CustomEvent("studio:addToCart"))}
            whileTap={{ scale: 0.97 }}
            className={`w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest
                        flex items-center justify-center gap-2 transition-all duration-300 ${
              addedOk
                ? "bg-green-500 text-white"
                : "bg-primary text-background hover:bg-primary/90 neon-glow-sm hover:shadow-neon-cyan"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {addedOk ? (
                <motion.span key="ok"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  ¡Agregado al carrito!
                </motion.span>
              ) : (
                <motion.span key="add"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  Agregar al carrito
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div> : (
          <p className="flex-shrink-0 rounded-xl border border-[#e2e4ed] bg-white p-3 text-[11px] leading-relaxed text-gray-600">
            La vista previa se puede personalizar y guardar. La integración con catálogo y carrito de este producto todavía está pendiente.
          </p>
        )}
      </div>

    </>
  );
}

// ── Botón de herramienta ──────────────────────────────────
function ToolBtn({ icon, label, onClick, className = "", disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
                  text-xs font-bold uppercase tracking-wider transition-all duration-200
                  text-gray-300 hover:text-white border border-white/10 hover:border-white/30
                  hover:bg-white/5 active:scale-95 disabled:cursor-wait disabled:opacity-50 ${className}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}

function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("El archivo no contiene una imagen legible."));
      image.onload = () => {
        const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo preparar la imagen."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.88));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
