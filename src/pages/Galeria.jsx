import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const CATEGORIES = [
  { value: "",            label: "Todos",      icon: "grid_view",      color: "#00f2ff",  desc: "Toda la colección" },
  { value: "cyberpunk",   label: "Cyberpunk",  icon: "memory",         color: "#ecb2ff",  desc: "Sci-fi y tecnología" },
  { value: "streetwear",  label: "Streetwear", icon: "skateboarding",  color: "#00f2ff",  desc: "Urbano y acción" },
  { value: "graficos",    label: "Gráficos",   icon: "brush",          color: "#bdec00",  desc: "Arte y diseño" },
  { value: "logos",       label: "Logos",      icon: "verified",       color: "#facc15",  desc: "Logos y posters" },
  { value: "minimalista", label: "Minimal",    icon: "minimize",       color: "#60a5fa",  desc: "Simple y limpio" },
  { value: "texturas",    label: "Texturas",   icon: "texture",        color: "#fb923c",  desc: "Fondos y tramas" },
  { value: "iconos",      label: "Íconos",     icon: "emoji_symbols",  color: "#f472b6",  desc: "Símbolos" },
  { value: "general",     label: "General",    icon: "category",       color: "#9ca3af",  desc: "Varios" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Galeria() {
  const [assets, setAssets]         = useState([]);
  const [counts, setCounts]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [selected, setSelected]     = useState(null); // imagen en modal

  // Carga contadores por categoría
  useEffect(() => {
    fetch(`${API}/api/assets/categories`)
      .then(r => r.json())
      .then(d => {
        const map = {};
        (d.categories || []).forEach(c => { map[c.value] = c.count; });
        setCounts(map);
      })
      .catch(() => {});
  }, []);

  // Carga imágenes
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "24", page: String(page) });
      if (category) params.set("category", category);
      if (search.trim()) params.set("search", search.trim());

      const res  = await fetch(`${API}/api/assets?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [category, search, page]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [category, search]); // eslint-disable-line react-hooks/set-state-in-effect

  const activeCat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];

  return (
    <div className="bg-background min-h-screen text-white">

      {/* ── Header ── */}
      <div className="relative overflow-hidden border-b border-white/6">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-48 rounded-full bg-secondary/6 blur-[80px]" />
          <div className="absolute top-0 right-0 w-64 h-48 rounded-full bg-primary/5 blur-[60px]" />
          <div className="absolute inset-0 bg-grid opacity-50" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-8">
          <motion.div initial="hidden" animate="show"
            variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.08 } } }}>
            <motion.p variants={fadeUp} className="section-label mb-2">Banco de Imágenes</motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-black uppercase leading-tight">
              Galería<br />
              <span className="text-gradient-neon">de Diseños</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-gray-500 mt-3 max-w-lg">
              {total > 0 ? `${total} imágenes disponibles para usar en tu diseño personalizado.` : "Explorá el banco de imágenes."}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* ── Categorías ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
          {CATEGORIES.map((cat) => {
            const count   = cat.value === "" ? Object.values(counts).reduce((a,b) => a+b, 0) : (counts[cat.value] || 0);
            const isActive = category === cat.value;
            return (
              <motion.button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-start gap-2 p-4 rounded-2xl border
                            transition-all duration-200 text-left ${
                  isActive
                    ? "border-primary/50 bg-primary/10"
                    : "glass-panel hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {/* Ícono */}
                <div className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center"
                     style={{ borderColor: isActive ? cat.color + "40" : undefined }}>
                  <span className="material-symbols-outlined text-[18px]"
                        style={{ color: cat.color }}>
                    {cat.icon}
                  </span>
                </div>
                {/* Info */}
                <div>
                  <p className="text-xs font-black text-white">{cat.label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{cat.desc}</p>
                </div>
                {/* Contador */}
                {count > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Barra de búsqueda + info ── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                             text-gray-600 text-[18px] pointer-events-none">search</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar diseño..."
              className="input-dark pl-10 py-2.5 text-sm" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="material-symbols-outlined text-[14px]" style={{ color: activeCat.color }}>
              {activeCat.icon}
            </span>
            <span className="font-bold">{activeCat.label}</span>
            {total > 0 && <span>— {total} imágenes</span>}
          </div>
          {(category || search) && (
            <button onClick={() => { setCategory(""); setSearch(""); }}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
              Limpiar
            </button>
          )}
        </div>

        {/* ── Grid de imágenes ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="flex justify-center py-24">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : assets.length === 0 ? (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="text-center py-24">
              <span className="material-symbols-outlined text-[64px] text-gray-800 mb-4 block">image_not_supported</span>
              <p className="text-xl font-black text-gray-500">Sin resultados</p>
              <button onClick={() => { setCategory(""); setSearch(""); }}
                className="mt-4 btn-outline text-xs py-2 px-6">Ver todos</button>
            </motion.div>
          ) : (
            <motion.div key={`${category}-${search}-${page}`}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {assets.map((asset, i) => (
                <motion.button
                  key={asset.id}
                  initial={{ opacity:0, scale:0.9 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ duration:0.3, delay: i * 0.02 }}
                  onClick={() => setSelected(asset)}
                  className="group relative aspect-square rounded-2xl overflow-hidden
                             border border-white/8 hover:border-primary/50
                             transition-all duration-200 hover:scale-[1.04] bg-zinc-900"
                >
                  <img src={asset.url} alt={asset.name} loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300
                               group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                                  transition-opacity duration-200 flex items-end justify-start p-2">
                    <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">
                      {asset.name}
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Paginación ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="btn-outline py-2 px-4 text-xs disabled:opacity-30">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              Anterior
            </button>
            <span className="text-sm text-gray-500 font-bold">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="btn-outline py-2 px-4 text-xs disabled:opacity-30">
              Siguiente
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* ── CTA ir al Studio ── */}
        {!loading && assets.length > 0 && (
          <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} className="mt-12">
            <div className="glass-panel-accent rounded-3xl p-8 flex flex-col sm:flex-row
                            items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <p className="section-label mb-1">Design Studio</p>
                <p className="font-black text-xl">¿Te gustó algún diseño?</p>
                <p className="text-gray-500 text-sm mt-1">
                  Usalo en tu remera personalizada directamente en el Studio.
                </p>
              </div>
              <Link to="/disenar" className="btn-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">design_services</span>
                Ir al Studio
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Modal imagen ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="overlay"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <motion.div key="modal"
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.9 }}
              transition={{ type:"spring", damping:25, stiffness:300 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2
                         md:-translate-x-1/2 md:-translate-y-1/2
                         md:w-[480px] md:max-h-[80vh]
                         glass-panel rounded-3xl overflow-hidden z-51 flex flex-col">
              <img src={selected.url} alt={selected.name}
                className="w-full flex-1 object-contain max-h-[60vh]" />
              <div className="p-5 border-t border-white/8 flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-sm">{selected.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {(selected.tags || []).slice(0,4).map(t => (
                      <span key={t} className="badge-cyan">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link to="/disenar"
                    className="btn-primary text-xs py-2 px-4">
                    <span className="material-symbols-outlined text-[16px]">design_services</span>
                    Usar
                  </Link>
                  <button onClick={() => setSelected(null)}
                    className="btn-outline text-xs py-2 px-3">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
