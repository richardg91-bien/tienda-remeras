import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Products from "../components/Products";
import { products, CATEGORIES } from "../data/products";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Catalogo() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortBy, setSortBy]                 = useState("default");
  const [search, setSearch]                 = useState("");
  const [aiOnly, setAiOnly]                 = useState(false);

  const filtered = useMemo(() => {
    let list = [...products];

    // Filtro por categoría
    if (activeCategory !== "Todos") {
      list = list.filter((p) => p.category === activeCategory);
    }

    // Filtro IA analizado
    if (aiOnly) {
      list = list.filter((p) => p.aiAnalyzed);
    }

    // Búsqueda
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }

    // Ordenamiento
    switch (sortBy) {
      case "price-asc":  return list.sort((a, b) => a.price - b.price);
      case "price-desc": return list.sort((a, b) => b.price - a.price);
      case "rating":     return list.sort((a, b) => b.rating - a.rating);
      case "new":        return list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      default:           return list;
    }
  }, [activeCategory, sortBy, search, aiOnly]);

  return (
    <div className="bg-background min-h-screen text-white">

      {/* ── Header de sección ── */}
      <div className="relative overflow-hidden border-b border-white/6">
        {/* Fondo decorativo */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-48 rounded-full bg-primary/6 blur-[80px]" />
          <div className="absolute top-0 right-0 w-64 h-48 rounded-full bg-secondary/5 blur-[60px]" />
          <div className="absolute inset-0 bg-grid opacity-60" />
        </div>

        <div className="relative z-10 px-6 pt-10 pb-12 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={fadeUp} className="section-label mb-2">Colección</motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-black uppercase leading-tight">
              Catálogo<br />
              <span className="text-gradient-neon">Exclusivo</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-gray-500 mt-3 max-w-md">
              Colección curada por IA. Diseños generativos premium.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">

          {/* Fila 1: categorías + toggle IA */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider
                            transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-background neon-glow-sm"
                    : "glass-panel text-white/60 hover:text-white hover:border-primary/30"
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Separador */}
            <div className="w-px h-6 bg-white/10 flex-shrink-0 mx-1" />

            {/* Toggle IA */}
            <button
              onClick={() => setAiOnly((v) => !v)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full
                          text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                aiOnly
                  ? "bg-secondary text-background"
                  : "glass-panel text-white/60 hover:text-white hover:border-secondary/30"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              Solo IA
            </button>
          </div>

          {/* Fila 2: búsqueda + sort */}
          <div className="flex gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                               text-gray-600 text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="input-dark pl-10 py-2.5 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-dark py-2.5 text-sm w-auto flex-shrink-0 cursor-pointer"
              aria-label="Ordenar por"
            >
              <option value="default">Relevancia</option>
              <option value="new">Más nuevos</option>
              <option value="rating">Mejor rating</option>
              <option value="price-asc">Precio: menor</option>
              <option value="price-desc">Precio: mayor</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Grid de productos ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Contador */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
            {activeCategory !== "Todos" && ` · ${activeCategory}`}
            {aiOnly && " · IA Analizado"}
          </p>
          {(activeCategory !== "Todos" || aiOnly || search) && (
            <button
              onClick={() => { setActiveCategory("Todos"); setAiOnly(false); setSearch(""); setSortBy("default"); }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Productos o vacío */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key={`${activeCategory}-${aiOnly}-${search}-${sortBy}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Products products={filtered} title="" />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center"
            >
              <span className="material-symbols-outlined text-[64px] text-gray-800 mb-4 block">
                search_off
              </span>
              <p className="text-xl font-black text-gray-500 mb-2">Sin resultados</p>
              <p className="text-gray-700 text-sm mb-6">
                No encontramos productos con esos filtros.
              </p>
              <button
                onClick={() => { setActiveCategory("Todos"); setAiOnly(false); setSearch(""); }}
                className="btn-outline py-2.5 px-6 text-xs"
              >
                Ver todos los productos
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Banner CTA inferior ── */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel-accent rounded-3xl p-8 flex flex-col sm:flex-row
                     items-center justify-between gap-6 text-center sm:text-left"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-1">
              ¿No encontrás lo que buscás?
            </p>
            <p className="font-black text-xl">Consultá con nuestro asistente IA</p>
            <p className="text-gray-500 text-sm mt-1">Recomendaciones personalizadas en segundos.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link to="/" className="btn-primary text-xs px-6 py-2.5">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              Quiz de estilo
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
