import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as fabric from "fabric";
import { setTshirtColor } from "../store/designerSlice.js";
import { useCanvas } from "../hooks/useCanvas.jsx";
import canvasStorageManager from "../utils/canvasStorageManager.js";
import AssetLibrary from "./AssetLibrary.jsx";
import {
  CANVAS_CONFIG, DEFAULT_TEXT_CONFIG,
  TSHIRT_COLOR_CODES, FONT_OPTIONS,
} from "../constants/designConstants.js";

const TABS = [
  { id: "tools",   icon: "build",         label: "Herramientas" },
  { id: "library", icon: "photo_library",  label: "Biblioteca"   },
];

export default function DesignTools({ manualSync }) {
  const [activeTab, setActiveTab] = useState("tools");
  const dispatch        = useDispatch();
  const tshirtColor     = useSelector((s) => s.designer.tshirtColor);
  const { activeCanvas, selectedObject, setSelectedObject } = useCanvas();
  const fileInputRef    = useRef(null);

  // Estado del panel de texto (solo visible cuando hay un textbox seleccionado)
  const [textProps, setTextProps] = useState({
    text:       "",
    color:      "#ffffff",
    font:       "arial",
    fontSize:   20,
  });

  // ── Acciones sobre el canvas ──────────────────────────
  const addImage = (e) => {
    if (!activeCanvas || !e.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => {
        const fabricImg = new fabric.Image(img);
        const maxW = CANVAS_CONFIG.width  * 0.5;
        const maxH = CANVAS_CONFIG.height * 0.5;
        if (fabricImg.width > maxW || fabricImg.height > maxH) {
          const scale = Math.min(maxW / fabricImg.width, maxH / fabricImg.height);
          fabricImg.scale(scale);
        }
        fabricImg.set({
          left: (activeCanvas.width  - fabricImg.getScaledWidth())  / 2,
          top:  (activeCanvas.height - fabricImg.getScaledHeight()) / 2,
        });
        activeCanvas.add(fabricImg);
        activeCanvas.setActiveObject(fabricImg);
        activeCanvas.renderAll();
        manualSync?.();
      };
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = "";
  };

  const addText = () => {
    if (!activeCanvas) return;
    const text = new fabric.Textbox("Tu texto aquí", {
      ...DEFAULT_TEXT_CONFIG,
      left:  activeCanvas.width  / 2,
      top:   activeCanvas.height / 2,
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

  const saveDesign = () => {
    if (!activeCanvas) return;
    const url  = activeCanvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const link = document.createElement("a");
    link.download = "neon-stitch-design.png";
    link.href = url;
    link.click();
  };

  // ── Actualiza texto seleccionado ──────────────────────
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
    <div className="flex flex-col h-full gap-3">

      {/* ── Selector de pestañas ── */}
      <div className="flex gap-1 glass-panel rounded-xl p-1 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                        text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-primary text-background"
                : "text-gray-500 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contenido de la pestaña activa ── */}
      {activeTab === "tools" && (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">

      {/* ── Sección: Diseño ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
          Diseño
        </p>
        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" ref={fileInputRef}
            onChange={addImage} className="hidden" />
          <ToolBtn icon="image" label="Subir imagen" onClick={() => fileInputRef.current?.click()} />
          <ToolBtn icon="title"   label="Agregar texto" onClick={addText} />
        </div>
      </div>

      {/* ── Sección: Color remera ── */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
          Color remera
        </p>
        <div className="flex flex-wrap gap-2">
          {TSHIRT_COLOR_CODES.map((c) => (
            <button key={c} onClick={() => dispatch(setTshirtColor(c))}
              title={c}
              className={`w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110 ${
                tshirtColor === c ? "border-primary scale-110" : "border-white/20"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* ── Sección: Editar texto (solo si hay textbox seleccionado) ── */}
      {isTextSelected && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary mb-3">
            Editar texto
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                Texto
              </label>
              <input type="text" value={textProps.text}
                onChange={(e) => updateText("text", e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                Fuente
              </label>
              <select value={textProps.font} onChange={(e) => updateText("font", e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-primary transition-colors cursor-pointer">
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                  Tamaño
                </label>
                <input type="number" min="8" max="120" value={textProps.fontSize}
                  onChange={(e) => updateText("fontSize", parseInt(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2
                             text-sm text-white focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                  Color
                </label>
                <input type="color" value={textProps.color}
                  onChange={(e) => updateText("color", e.target.value)}
                  className="w-full h-10 bg-zinc-900 border border-white/10 rounded-xl cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sección: Acciones ── */}
      <div className="border-t border-white/10 pt-3 mt-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tertiary mb-2">
          Acciones
        </p>
        <div className="flex flex-col gap-2">
          <ToolBtn icon="download" label="Guardar diseño" onClick={saveDesign}
            className="border border-primary/40 hover:border-primary text-primary hover:bg-primary/10" />
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

    </div>
  );
}

// ── Botón de herramienta reutilizable ─────────────────────
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
