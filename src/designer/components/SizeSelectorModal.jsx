import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { useCanvas } from "../hooks/useCanvas.jsx";
import { useCart } from "../../context/CartContext.jsx";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/**
 * Modal de selección de talle del Studio.
 * Se monta SIEMPRE (a nivel de página, fuera del panel de herramientas) y
 * escucha el evento global "studio:addToCart". Se renderiza con createPortal
 * en document.body para quedar adelante de todo (canvas 2D / 3D incluidos),
 * centrado y completamente visible.
 */
export default function SizeSelectorModal({ frontCanvas, backCanvas }) {
  const [show, setShow] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);

  const tshirtColor = useSelector((s) => s.designer.tshirtColor);
  const { activeCanvas } = useCanvas();
  const { addItem, openCart } = useCart();

  // Escucha el evento del botón "Agregar al carrito" (mobile y desktop).
  // Si el evento trae detail.size (pestaña Carrito), lo preselecciona.
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.size) setSelectedSize(e.detail.size);
      setShow(true);
    };
    document.addEventListener("studio:addToCart", handler);
    return () => document.removeEventListener("studio:addToCart", handler);
  }, []);

  const handleClose = () => { setShow(false); setSelectedSize(null); };

  const handleAddToCart = async () => {
    if (!selectedSize) return;
    setAddingToCart(true);

    try {
      const canvas    = activeCanvas;
      const hasDesign = canvas && canvas.getObjects().length > 0;

      const designImage = hasDesign
        ? canvas.toDataURL({ format: "png", quality: 0.8, multiplier: 1 })
        : null;

      const customProduct = {
        id:            `custom-${Date.now()}`,
        name:          "Remera Personalizada NEON-STITCH",
        price:         15000,
        originalPrice: null,
        category:      "Personalizada",
        sizes:         SIZES,
        colors:        [tshirtColor],
        stock:         99,
        isNew:         true,
        isBestSeller:  false,
        rating:        5,
        reviews:       0,
        image:         designImage || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
        description:   `Remera personalizada con tu diseño. Color: ${tshirtColor}`,
        isCustom:      true,
        designData: {
          tshirtColor,
          frontDesign: frontCanvas?.toDataURL({ format: "png", quality: 0.6 }) || null,
          backDesign:  backCanvas?.toDataURL({ format: "png", quality: 0.6 }) || null,
        },
      };

      addItem(customProduct, selectedSize);

      // Aviso al panel de herramientas para el feedback "¡Agregado!"
      document.dispatchEvent(new CustomEvent("studio:addedToCart"));

      setShow(false);
      setSelectedSize(null);

      setTimeout(() => openCart(), 800);
    } catch (err) {
      console.error("Error agregando al carrito:", err);
    } finally {
      setAddingToCart(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10002]"
          />

          {/* Modal — siempre centrado, adelante de todo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: "20px", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, y: "20px", x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2
                       w-[calc(100vw-32px)] max-w-sm
                       bg-zinc-950 border border-white/10 rounded-3xl z-[10003]
                       shadow-[0_20px_60px_rgba(0,0,0,0.8)]
                       flex flex-col overflow-hidden"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8 flex-shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-0.5">
                  Último paso
                </p>
                <h3 className="font-black text-lg">Elegí tu talle</h3>
              </div>
              <button onClick={handleClose}
                className="text-gray-600 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Preview del diseño */}
              <div className="flex items-center gap-3 p-3 glass-panel rounded-2xl">
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
              <div className="grid grid-cols-3 gap-2">
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

              <p className="text-[10px] text-gray-600 text-center">
                Para look oversize elegí un talle más grande
              </p>
            </div>

            {/* Botón confirmar */}
            <div className="px-6 pb-6 pt-3 border-t border-white/8 flex-shrink-0">
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
