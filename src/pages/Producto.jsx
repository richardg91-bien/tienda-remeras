import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { products, formatPrice } from "../data/products";
import { useCart } from "../context/CartContext";
import Products from "../components/Products";

// Paleta oficial de colores de remeras
const PALETTE = [
  { hex: "#313231", name: "Carbón"         },
  { hex: "#131217", name: "Negro Profundo"  },
  { hex: "#02A267", name: "Verde Esmeralda" },
  { hex: "#DEDFDC", name: "Hueso"           },
  { hex: "#131313", name: "Negro"           },
  { hex: "#544434", name: "Marrón"          },
  { hex: "#22242A", name: "Gris Oscuro"     },
  { hex: "#0486D7", name: "Azul Neon"       },
  { hex: "#232323", name: "Grafito"         },
  { hex: "#1C3455", name: "Azul Marino"     },
  { hex: "#F97301", name: "Naranja"         },
  { hex: "#E8C6A6", name: "Arena"           },
  { hex: "#7560A0", name: "Violeta"         },
  { hex: "#FDD107", name: "Amarillo"        },
];

// Colores claros que necesitan check oscuro
const LIGHT_COLORS = ["#DEDFDC", "#E8C6A6", "#FDD107"];

const BENEFITS = [
  { icon: "local_shipping", label: "Envío gratis", desc: "En compras +$30.000" },
  { icon: "verified",       label: "Calidad garantizada", desc: "Devolución en 30 días" },
  { icon: "psychology",     label: "Diseño por IA", desc: "Patrón generativo único" },
  { icon: "schedule",       label: "Entrega en 48hs", desc: "CABA y GBA" },
];

export default function Producto() {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const product         = products.find(p => p.id === parseInt(id));
  const { addItem, openCart } = useCart();

  const [selectedSize, setSelectedSize]   = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [zoom, setZoom]                   = useState(false);
  const [added, setAdded]                 = useState(false);
  const [sizeError, setSizeError]         = useState(false);
  const [qty, setQty]                     = useState(1);

  // Productos relacionados
  const related = products
    .filter(p => p.id !== product?.id && p.category === product?.category)
    .slice(0, 4);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-[64px] text-gray-700">search_off</span>
        <p className="text-xl font-black text-gray-500">Producto no encontrado</p>
        <Link to="/catalogo" className="btn-primary text-xs px-6 py-2.5">
          Ver catálogo
        </Link>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    for (let i = 0; i < qty; i++) addItem(product, selectedSize);
    setAdded(true);
    setTimeout(() => { setAdded(false); openCart(); }, 1000);
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    addItem(product, selectedSize);
    openCart();
  };

  return (
    <div className="bg-background min-h-screen text-white">

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-2 text-xs text-gray-600">
        <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link to="/catalogo" className="hover:text-primary transition-colors">Catálogo</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-gray-400">{product.name}</span>
      </div>

      {/* ── Grid principal ── */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* ── Imagen ── */}
          <div className="lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              {/* Imagen principal */}
              <div
                onClick={() => setZoom(true)}
                className="relative overflow-hidden rounded-3xl cursor-zoom-in
                           border border-white/10 aspect-square bg-zinc-900"
              >
                <img
                  src={product.image.replace("w=600", "w=900")}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.aiAnalyzed && (
                    <span className="badge-solid flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">psychology</span>
                      IA Analizado
                    </span>
                  )}
                  {product.isNew && (
                    <span className="badge-cyan">Nuevo</span>
                  )}
                  {discount && (
                    <span className="badge bg-red-500 text-white">-{discount}%</span>
                  )}
                  {product.stock <= 5 && (
                    <span className="badge bg-orange-500 text-white">Últimas {product.stock} unidades</span>
                  )}
                </div>
                {/* Ícono zoom */}
                <div className="absolute bottom-4 right-4 glass-panel rounded-xl p-2
                                opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[18px] text-white">zoom_in</span>
                </div>
              </div>
              {/* Hint zoom */}
              <p className="text-center text-[10px] text-gray-700 mt-2 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[12px]">zoom_in</span>
                Click para ampliar
              </p>
            </motion.div>
          </div>

          {/* ── Info del producto ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-6"
          >
            {/* Categoría + nombre */}
            <div>
              <p className="section-label mb-2">{product.category}</p>
              <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight">
                {product.name}
              </h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "text-primary" : "text-gray-800"}`}
                    fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-bold text-white">{product.rating}</span>
              <span className="text-sm text-gray-600">({product.reviews} reseñas)</span>
              {product.isBestSeller && (
                <span className="badge bg-white/10 text-white border border-white/20">Best Seller</span>
              )}
            </div>

            {/* Precio */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-primary">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-xl text-gray-600 line-through">{formatPrice(product.originalPrice)}</span>
              )}
              {discount && (
                <span className="text-sm font-black text-green-400">Ahorrás {formatPrice(product.originalPrice - product.price)}</span>
              )}
            </div>

            {/* Descripción */}
            <p className="text-gray-400 leading-relaxed">{product.description}</p>

            {/* Colores */}
            {product.colors?.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                  Color{selectedColor ? `: ${selectedColor}` : ""}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map(c => (
                    <button key={c.hex} onClick={() => setSelectedColor(c.name)}
                      title={c.name}
                      className={`w-9 h-9 rounded-full border-2 transition-all duration-150
                                  hover:scale-110 relative group ${
                        selectedColor === c.name ? "border-primary scale-110" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {selectedColor === c.name && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px]"
                                style={{ color: LIGHT_COLORS.includes(c.hex) ? "#000" : "#fff" }}>
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

            {/* Talles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-black uppercase tracking-widest transition-colors ${
                  sizeError ? "text-red-400" : "text-gray-500"
                }`}>
                  {sizeError ? "⚠️ Seleccioná un talle" : `Talle${selectedSize ? `: ${selectedSize}` : ""}`}
                </p>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">straighten</span>
                  Guía de talles
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(size => (
                  <motion.button key={size} onClick={() => setSelectedSize(size)}
                    whileTap={{ scale: 0.95 }}
                    className={`min-w-[48px] h-12 px-3 rounded-xl font-black text-sm border
                                transition-all duration-150 ${
                      selectedSize === size
                        ? "bg-primary border-primary text-background neon-glow-sm"
                        : sizeError
                        ? "border-red-500/50 text-red-400 hover:border-red-400"
                        : "border-white/15 text-gray-400 hover:border-primary/60 hover:text-white"
                    }`}>
                    {size}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            <div className="flex items-center gap-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">Cantidad</p>
              <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-500
                             hover:text-white hover:bg-white/5 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span className="w-10 text-center font-black text-white">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-500
                             hover:text-white hover:bg-white/5 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
              <span className="text-xs text-gray-600">{product.stock} disponibles</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={handleBuyNow}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest
                           bg-primary text-background neon-glow-sm hover:bg-primary/90
                           transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                Comprar ahora
              </motion.button>
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest
                            transition-all duration-200 flex items-center justify-center gap-2
                            border ${added
                              ? "bg-green-500 border-green-500 text-white"
                              : "glass-panel border-white/20 hover:border-primary/50 text-white"
                            }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span key="ok" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
                      exit={{ opacity:0 }} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      ¡Agregado!
                    </motion.span>
                  ) : (
                    <motion.span key="add" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                      Agregar al carrito
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* CTA Design Studio */}
            <Link to="/disenar"
              className="flex items-center gap-3 p-4 glass-panel-accent rounded-2xl
                         hover:border-primary/40 transition-all duration-200 group">
              <span className="material-symbols-outlined text-primary text-[28px]">design_services</span>
              <div className="flex-1">
                <p className="font-black text-sm">¿Querés personalizarla?</p>
                <p className="text-xs text-gray-500">Diseñá tu propia versión en el Studio 3D</p>
              </div>
              <span className="material-symbols-outlined text-gray-600 group-hover:text-primary
                               transition-colors text-[18px]">arrow_forward</span>
            </Link>

            {/* Beneficios */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/8">
              {BENEFITS.map(b => (
                <div key={b.label} className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">
                    {b.icon}
                  </span>
                  <div>
                    <p className="text-xs font-black text-white">{b.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {product.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10
                                           text-gray-500 uppercase tracking-wider font-bold">
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Productos relacionados ── */}
        {related.length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="section-label mb-1">También te puede gustar</p>
                <h2 className="text-3xl font-black uppercase">Relacionados</h2>
              </div>
              <Link to="/catalogo" className="btn-outline text-xs py-2 px-4 hidden md:flex">
                Ver todo
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <Products products={related} title="" />
          </div>
        )}
      </div>

      {/* ── CTA flotante mobile ── */}
      <div className="fixed bottom-24 left-0 right-0 px-4 z-30 md:hidden">
        <motion.button
          onClick={handleAddToCart}
          whileTap={{ scale: 0.97 }}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest
                      flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                      transition-all duration-200 ${
            added ? "bg-green-500 text-white" : "bg-primary text-background neon-glow"
          }`}
        >
          {added ? (
            <><span className="material-symbols-outlined text-[18px]">check_circle</span> ¡Agregado al carrito!</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              {selectedSize ? `Agregar talle ${selectedSize}` : "Elegir talle y agregar"}</>
          )}
        </motion.button>
      </div>

      {/* ── Modal zoom ── */}
      <AnimatePresence>
        {zoom && (
          <>
            <motion.div key="overlay"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setZoom(false)}
              className="fixed inset-0 bg-black/90 z-50 cursor-zoom-out" />
            <motion.div key="img"
              initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.8 }}
              transition={{ type:"spring", damping:25 }}
              className="fixed inset-4 md:inset-12 z-50 flex items-center justify-center"
              onClick={() => setZoom(false)}
            >
              <img src={product.image.replace("w=600","w=1200")} alt={product.name}
                className="max-w-full max-h-full object-contain rounded-2xl" />
              <button onClick={() => setZoom(false)}
                className="absolute top-4 right-4 glass-panel p-2 rounded-xl">
                <span className="material-symbols-outlined text-white text-[22px]">close</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
