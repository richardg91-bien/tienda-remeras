import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import * as fabric from "fabric";
import { setTshirtColor } from "../store/designerSlice.js";
import { useCanvas } from "../hooks/useCanvas.jsx";
import canvasStorageManager from "../utils/canvasStorageManager.js";
import AssetLibrary from "./AssetLibrary.jsx";
import { useCart } from "../../context/CartContext.jsx";
import {
  CANVAS_CONFIG, DEFAULT_TEXT_CONFIG,
  TSHIRT_COLOR_CODES, FONT_OPTIONS,
} from "../constants/designConstants.js";

const TABS = [
  { id: "tools",   icon: "build",        label: "Herramientas" },
  { id: "library", icon: "photo_library", label: "Biblioteca"  },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function DesignTools({ manualSync, frontCanvas, backCanvas }) {
  const [activeTab, setActiveTab]     = useState("tools");
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedSize, setSelectedSize]  = useState(null);
  const [addingToCart, setAddingToCart]  = useState(false);
  const [addedOk, setAddedOk]            = useState(false);

  const dispatch    = useDispatch();
  const tshirtColor = useSelector((s) => s.designer.tshirtColor);
  const selectedView = useSelector((s) => s.designer.selectedView);
  const { activeCanvas, selectedObject, setSelectedObject } = useCanvas();
  const { addItem, openCart } = useCart();

  const [textProps, setTextProps] = useState({
    text: "", color: "#ffffff", font: "arial", fontSize: 20,
  });

  // ── Canvas al carrito ─────────────────────────────────
  const handleAddToCart = async () => {
    if (!selectedSize) return;
    setAddingToCart(true);

    try {
      // Captura el canvas actual (frente o dorso según la vista activa)
      const canvas    = activeCanvas;
      const hasDesign = canvas && canvas.getObjects().length > 0;

      // Genera miniatura del diseño como dataURL
      const designImage = hasDesign
        ? canvas.toDataURL({ format: "png", quality: 0.8, multiplier: 1 })
        : null;

      // Construye el producto personalizado
      const customProduct = {
        id:          `custom-${Date.now()}`,
        name:        "Remera Personalizada NEON-STITCH",
        price:       15000,
        originalPrice: null,
        category:    "Personalizada",
        sizes:       SIZES,
        colors:      [tshirtColor],
        stock:       99,
        isNew:       true,
        isBestSeller: false,
        rating:      5,
        reviews:     0,
        // Usa la captura del diseño como imagen del producto en el carrito
        image:       designImage || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
        description: `Remera personalizada con tu diseño. Color: ${tshirtColor}`,
        isCustom:    true,
        designData: {
          tshirtColor,
          frontDesign: frontCanvas?.toDataURL({ format: "png", quality: 0.6 }) || null,
          backDesign:  backCanvas?.toDataURL({ format: "png", quality: 0.6 }) || null,
        },
      };

      addItem(customProduct, selectedSize);

      setAddedOk(true);
      setShowSizeModal(false);
      setSelectedSize(null);

      setTimeout(() => {
        setAddedOk(false);
        openCart();
      }, 800);
    } catch (err) {
      console.error("Error agregando al carrito:", err);
    } finally {
      setAddingToCart(false);
    }
  };

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
    setTextProps({ text: "Tu texto aquí", color: DEFAULT_TEXT_CONFIG.fill, font: "arial", fontSize: 20 });
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
    if (!activeCanvas) return;
    activeCanvas.clear();
    canvasStorageManager.clearCanvasStorage("all");
    activeCanvas.renderAll();
    manualSync?.();
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
      <div className="flex flex-col h-full gap-3">

        {/* ── Selector de pestañas ── */}
        <div className="flex gap-1 glass-panel rounded-xl p-1 flex-shrink-0">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                          text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-background"
                  : "text-gray-500 hover:text-white"
              }`}>
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Pestaña: Herramientas ── */}
        {activeTab === "tools" && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">

            {/* Diseño */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
                Diseño
              </p>
              <div className="flex flex-col gap-2">
                <ToolBtn icon="title" label="Agregar texto" onClick={addText} />
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
              </div>
            </div>

            {/* Color remera */}
            <div className="border-t border-white/10 pt-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
                Color remera
              </p>
              <div className="flex flex-wrap gap-2">
                {TSHIRT_COLOR_CODES.map((c) => (
                  <button key={c} onClick={() => dispatch(setTshirtColor(c))} title={c}
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110 ${
                      tshirtColor === c ? "border-primary scale-110" : "border-white/20"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

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
        {activeTab === "library" && (
          <div className="flex-1 overflow-hidden">
            <AssetLibrary manualSync={manualSync} />
          </div>
        )}

        {/* ── Botón principal: Agregar al carrito ── */}
        <div className="flex-shrink-0 pt-2 border-t border-white/10">
          <motion.button
            onClick={() => setShowSizeModal(true)}
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
        </div>
      </div>

      {/* ── Modal selector de talle ── */}
      <AnimatePresence>
        {showSizeModal && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowSizeModal(false); setSelectedSize(null); }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 bottom-8 md:inset-auto md:left-1/2 md:top-1/2
                         md:-translate-x-1/2 md:-translate-y-1/2 md:w-96
                         bg-zinc-950 border border-white/10 rounded-3xl p-6 z-[61]
                         shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-0.5">
                    Último paso
                  </p>
                  <h3 className="font-black text-lg">Elegí tu talle</h3>
                </div>
                <button onClick={() => { setShowSizeModal(false); setSelectedSize(null); }}
                  className="text-gray-600 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Preview del diseño */}
              <div className="flex items-center gap-3 p-3 glass-panel rounded-2xl mb-5">
                <div className="w-12 h-14 rounded-xl flex-shrink-0 border border-white/10
                                flex items-center justify-center"
                     style={{ backgroundColor: tshirtColor }}>
                  <span className="material-symbols-outlined text-[20px] text-black/40">checkroom</span>
                </div>
                <div>
                  <p className="font-black text-sm">Remera Personalizada</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Color: <span className="inline-block w-2.5 h-2.5 rounded-full align-middle mx-1 border border-white/20"
                      style={{ backgroundColor: tshirtColor }} />
                    Tu diseño incluido
                  </p>
                  <p className="text-primary font-black text-sm mt-1">$15.000</p>
                </div>
              </div>

              {/* Grid de talles */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {SIZES.map((size) => (
                  <button key={size} onClick={() => setSelectedSize(size)}
                    className={`py-3 rounded-xl font-black text-sm border transition-all duration-150 ${
                      selectedSize === size
                        ? "bg-primary border-primary text-background neon-glow-sm"
                        : "border-white/15 text-gray-400 hover:border-primary/60 hover:text-white"
                    }`}>
                    {size}
                  </button>
                ))}
              </div>

              {/* Guía de talles */}
              <p className="text-[10px] text-gray-600 text-center mb-4">
                Para look oversize elegí un talle más grande
              </p>

              {/* Botón confirmar */}
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || addingToCart}
                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest
                           bg-primary text-background transition-all duration-200
                           hover:bg-primary/90 hover:scale-[1.02] active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
                           flex items-center justify-center gap-2 neon-glow-sm"
              >
                {addingToCart ? (
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                    {selectedSize ? `Agregar talle ${selectedSize}` : "Seleccioná un talle"}
                  </>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Botón de herramienta ──────────────────────────────────
function ToolBtn({ icon, label, onClick, className = "" }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
                  text-xs font-bold uppercase tracking-wider transition-all duration-200
                  text-gray-300 hover:text-white border border-white/10 hover:border-white/30
                  hover:bg-white/5 active:scale-95 ${className}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}
