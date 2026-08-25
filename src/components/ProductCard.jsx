import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../data/products";

export default function ProductCard({ product }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [added, setAdded]               = useState(false);
  const [showSizes, setShowSizes]       = useState(false);
  const { addItem, openCart }           = useCart();

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const handleAdd = () => {
    if (!selectedSize) { setShowSizes(true); return; }
    addItem(product, selectedSize);
    setAdded(true);
    setTimeout(() => { setAdded(false); openCart(); }, 1000);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="product-card group flex flex-col"
    >
      {/* ── Imagen ── */}
      <div className="relative overflow-hidden rounded-t-[2rem] aspect-[3/4] bg-surface">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* overlay sutil en hover */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.aiAnalyzed && (
            <span className="badge-solid flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">psychology</span>
              IA Analizado
            </span>
          )}
          {product.isNew && !product.aiAnalyzed && (
            <span className="badge-cyan">Nuevo</span>
          )}
          {product.isBestSeller && (
            <span className="badge bg-white/90 text-background">Best Seller</span>
          )}
          {discount && (
            <span className="badge bg-red-500 text-white">-{discount}%</span>
          )}
          {product.stock <= 5 && (
            <span className="badge bg-orange-500/90 text-white">Últimas</span>
          )}
        </div>

        {/* Selector de talle overlay */}
        <AnimatePresence>
          {showSizes && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-3 left-3 right-3 glass-panel rounded-2xl p-3"
            >
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                Elegí un talle:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => { setSelectedSize(size); setShowSizes(false); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all duration-150 ${
                      selectedSize === size
                        ? "bg-primary border-primary text-background"
                        : "border-white/20 text-gray-300 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 p-5">
        {/* Categoría */}
        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-gray-600 mb-1">
          {product.category}
        </span>

        {/* Nombre */}
        <h3 className="font-black text-lg leading-snug mb-2 line-clamp-2 text-white">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${i < Math.floor(product.rating) ? "text-primary" : "text-gray-800"}`}
                fill="currentColor" viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-600">({product.reviews})</span>
        </div>

        {/* Precio */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-black text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-700 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Talles inline */}
        {!showSizes && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                aria-label={`Talle ${size}`}
                className={`w-9 h-9 rounded-xl text-[11px] font-black border transition-all duration-150 ${
                  selectedSize === size
                    ? "bg-primary border-primary text-background neon-glow-sm"
                    : "border-white/10 text-gray-500 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Botón añadir */}
        <button
          onClick={handleAdd}
          disabled={added}
          className={`mt-auto w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest
                      transition-all duration-300 flex items-center justify-center gap-2 ${
            added
              ? "bg-primary text-background scale-95"
              : selectedSize
              ? "bg-tertiary hover:scale-[1.02] active:scale-95 text-background"
              : "glass-panel text-white hover:border-primary/40"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span
                key="ok"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                ¡Agregado!
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {selectedSize ? "add_shopping_cart" : "straighten"}
                </span>
                {selectedSize ? "Añadir al Carrito" : "Elegir Talle"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.article>
  );
}
