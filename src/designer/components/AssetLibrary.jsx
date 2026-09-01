import { useState, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import { useCanvas } from "../hooks/useCanvas.jsx";
import { CANVAS_CONFIG } from "../constants/designConstants.js";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Categorías con ícono, color y descripción
const CATEGORIES = [
  { value: "",            label: "Todos",       icon: "grid_view",     color: "text-white",    desc: "Todo el banco" },
  { value: "streetwear",  label: "Streetwear",  icon: "skateboarding", color: "text-primary",  desc: "Urbano y acción" },
  { value: "cyberpunk",   label: "Cyberpunk",   icon: "memory",        color: "text-secondary",desc: "Sci-fi y tech" },
  { value: "graficos",    label: "Gráficos",    icon: "brush",         color: "text-tertiary", desc: "Arte y diseño" },
  { value: "logos",       label: "Logos",       icon: "verified",      color: "text-yellow-400",desc: "Logos y posters" },
  { value: "minimalista", label: "Minimal",     icon: "minimize",      color: "text-blue-400", desc: "Simple y limpio" },
  { value: "texturas",    label: "Texturas",    icon: "texture",       color: "text-orange-400",desc: "Fondos y tramas" },
  { value: "iconos",      label: "Íconos",      icon: "emoji_symbols", color: "text-pink-400", desc: "Símbolos" },
  { value: "general",     label: "General",     icon: "category",      color: "text-gray-400", desc: "Varios" },
];

export default function AssetLibrary({ manualSync, frontCanvas, backCanvas, selectedView }) {
  // Usa el canvas de la vista activa directamente (no del contexto)
  const canvasToUse = selectedView === "back" ? backCanvas : frontCanvas;
  const [assets, setAssets]           = useState([]);
  const [counts, setCounts]           = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [category, setCategory]       = useState("");
  const [search, setSearch]           = useState("");
  const [adding, setAdding]           = useState(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalItems, setTotalItems]   = useState(0);
  const [view, setView]               = useState("menu"); // "menu" | "grid"

  // ── Carga contadores por categoría ───────────────────
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res  = await fetch(`${API}/api/assets/categories`);
        const data = await res.json();
        const map  = {};
        (data.categories || []).forEach(c => { map[c.value] = c.count; });
        // Suma total
        map[""] = Object.values(map).reduce((a, b) => a + b, 0);
        setCounts(map);
      } catch { /* silencioso */ }
    };
    fetchCounts();
  }, []);

  // ── Carga imágenes ────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "18", page: String(page) });
      if (category) params.set("category", category);
      if (search.trim()) params.set("search", search.trim());

      const res  = await fetch(`${API}/api/assets?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error cargando imágenes.");

      setAssets(data.assets || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { setPage(1); }, [category, search]);

  // Cuando selecciona categoría, pasa a la vista grilla
  const selectCategory = (cat) => {
    setCategory(cat);
    setView("grid");
  };

  // ── Agrega imagen al canvas ───────────────────────────
  const addToCanvas = async (asset) => {
    if (!canvasToUse || adding) return;
    setAdding(asset.id);
    try {
      const img = await fabric.Image.fromURL(asset.url, { crossOrigin: "anonymous" });
      const maxW  = CANVAS_CONFIG.width  * 0.4;
      const maxH  = CANVAS_CONFIG.height * 0.4;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      img.scale(scale);
      img.set({
        left: (canvasToUse.width  - img.getScaledWidth())  / 2,
        top:  (canvasToUse.height - img.getScaledHeight()) / 2,
      });
      canvasToUse.add(img);
      canvasToUse.setActiveObject(img);
      canvasToUse.renderAll();
      // Pequeño delay para que Fabric termine de renderizar antes de sincronizar
      await new Promise(r => setTimeout(r, 60));
      manualSync?.();
    } catch {
      setError("No se pudo cargar la imagen.");
    } finally {
      setAdding(null);
    }
  };

  const activeCat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];

  return (
    <div className="flex flex-col h-full gap-2">

      {/* ── Vista: Menú de categorías ── */}
      {view === "menu" && (
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">
            Elegí una categoría
          </p>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => selectCategory(cat.value)}
              className="flex items-center gap-3 p-3 rounded-2xl border border-white/8
                         hover:border-primary/40 hover:bg-white/5 transition-all duration-200
                         group text-left active:scale-95"
            >
              {/* Ícono */}
              <div className={`w-9 h-9 rounded-xl glass-panel flex items-center justify-center
                               flex-shrink-0 group-hover:border-primary/30 transition-colors`}>
                <span className={`material-symbols-outlined text-[18px] ${cat.color}`}>
                  {cat.icon}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white">{cat.label}</p>
                <p className="text-[10px] text-gray-600">{cat.desc}</p>
              </div>

              {/* Contador */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {counts[cat.value] > 0 && (
                  <span className="text-[10px] font-black text-gray-600 bg-white/5
                                   px-2 py-0.5 rounded-full border border-white/8">
                    {counts[cat.value] || 0}
                  </span>
                )}
                <span className="material-symbols-outlined text-gray-700 text-[16px]
                                 group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Vista: Grilla de imágenes ── */}
      {view === "grid" && (
        <>
          {/* Header con back + título + búsqueda */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setView("menu")}
              className="p-1.5 rounded-xl text-gray-500 hover:text-primary hover:bg-white/5
                         transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div className={`w-6 h-6 rounded-lg glass-panel flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined text-[14px] ${activeCat.color}`}>
                {activeCat.icon}
              </span>
            </div>
            <p className="text-xs font-black text-white truncate flex-1">{activeCat.label}</p>
            <span className="text-[10px] text-gray-600 flex-shrink-0">{totalItems}</span>
          </div>

          {/* Buscador */}
          <div className="relative flex-shrink-0">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2
                             text-gray-600 text-[15px] pointer-events-none">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl
                         pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600
                         focus:outline-none focus:border-primary transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          {/* Grilla */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400 text-xs">{error}</p>
                <button onClick={fetchAssets} className="mt-3 text-xs text-primary hover:underline">
                  Reintentar
                </button>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-[40px] text-gray-700 block mb-2">
                  image_not_supported
                </span>
                <p className="text-gray-600 text-xs">Sin imágenes en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => addToCanvas(asset)}
                    disabled={!!adding}
                    title={asset.name}
                    className="relative group aspect-square rounded-xl overflow-hidden
                               border border-white/8 hover:border-primary/50
                               transition-all duration-200 hover:scale-[1.04]
                               active:scale-95 disabled:opacity-50 disabled:cursor-wait bg-zinc-900"
                  >
                    <img src={asset.url} alt={asset.name} loading="lazy"
                      className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                                    transition-opacity duration-200 flex items-center justify-center">
                      {adding === asset.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Paginación */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3 pb-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-500
                             hover:text-white disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <span className="text-[10px] text-gray-500 font-bold">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-500
                             hover:text-white disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
