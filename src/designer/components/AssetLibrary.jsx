import { useState, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import { useCanvas } from "../hooks/useCanvas.jsx";
import { CANVAS_CONFIG } from "../constants/designConstants.js";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const CATEGORIES = [
  { value: "",            label: "Todos" },
  { value: "logos",       label: "Logos" },
  { value: "iconos",      label: "Íconos" },
  { value: "graficos",    label: "Gráficos" },
  { value: "texturas",    label: "Texturas" },
  { value: "streetwear",  label: "Streetwear" },
  { value: "cyberpunk",   label: "Cyberpunk" },
  { value: "minimalista", label: "Minimal" },
  { value: "general",     label: "General" },
];

export default function AssetLibrary({ manualSync }) {
  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [category, setCategory]     = useState("");
  const [search, setSearch]         = useState("");
  const [adding, setAdding]         = useState(null); // id del asset que se está agregando
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { activeCanvas } = useCanvas();

  // ── Cargar imágenes del banco ─────────────────────────
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "20", page: String(page) });
      if (category) params.set("category", category);
      if (search.trim()) params.set("search", search.trim());

      const res  = await fetch(`${API}/api/assets?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error cargando imágenes.");

      setAssets(data.assets || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page al cambiar filtros
  useEffect(() => { setPage(1); }, [category, search]);

  // ── Agregar imagen al canvas ──────────────────────────
  const addToCanvas = async (asset) => {
    if (!activeCanvas || adding) return;
    setAdding(asset.id);

    try {
      const img = await fabric.Image.fromURL(asset.url, { crossOrigin: "anonymous" });

      const maxW  = CANVAS_CONFIG.width  * 0.4;
      const maxH  = CANVAS_CONFIG.height * 0.4;
      const scale = Math.min(maxW / img.width, maxH / img.height);

      img.scale(scale);
      img.set({
        left: (activeCanvas.width  - img.getScaledWidth())  / 2,
        top:  (activeCanvas.height - img.getScaledHeight()) / 2,
      });

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.renderAll();
      manualSync?.();
    } catch {
      setError("No se pudo cargar la imagen en el canvas.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2
                         text-gray-600 text-[15px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar imagen..."
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

      {/* Filtros de categoría */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black
                        uppercase tracking-wider transition-all duration-150 ${
              category === cat.value
                ? "bg-primary text-background"
                : "border border-white/10 text-gray-500 hover:text-white hover:border-white/30"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grilla de imágenes */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-[32px] text-red-400/50 block mb-2">
              error
            </span>
            <p className="text-red-400 text-xs">{error}</p>
            <button onClick={fetchAssets}
              className="mt-3 text-xs text-primary hover:underline">
              Reintentar
            </button>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[40px] text-gray-700 block mb-2">
              image_not_supported
            </span>
            <p className="text-gray-600 text-xs">No hay imágenes en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => addToCanvas(asset)}
                disabled={!!adding}
                title={asset.name}
                className="relative group aspect-square rounded-xl overflow-hidden
                           border border-white/8 hover:border-primary/50
                           transition-all duration-200 hover:scale-[1.03]
                           active:scale-95 disabled:opacity-50 disabled:cursor-wait
                           bg-zinc-900"
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />

                {/* Overlay en hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                                transition-opacity duration-200 flex items-center justify-center">
                  {adding === asset.id ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent
                                    rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      add_circle
                    </span>
                  )}
                </div>

                {/* Badge categoría */}
                <div className="absolute bottom-1 left-1">
                  <span className="text-[8px] font-black uppercase tracking-wider
                                   bg-black/70 text-gray-400 px-1.5 py-0.5 rounded-full">
                    {asset.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pb-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-white/10 text-gray-500
                         hover:text-white hover:border-white/30 transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="text-[10px] text-gray-500 font-bold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-white/10 text-gray-500
                         hover:text-white hover:border-white/30 transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
