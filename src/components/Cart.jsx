import { useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../data/products";

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE || "5491122334455";
const BACKEND_URL    = import.meta.env.VITE_BACKEND_URL    || "http://localhost:3000";

export default function Cart() {
  const {
    items, isOpen, closeCart,
    removeItem, updateQty,
    clearCart, totalItems, totalPrice,
  } = useCart();

  const dragControls = useDragControls();

  // ── Checkout MercadoPago ─────────────────────────────
  const checkoutMP = async () => {
    if (items.length === 0) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/create_preference`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cart: items.map((i) => ({
            name:     i.name,
            price:    i.price,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("Error al generar el pago. Intentá de nuevo.");
      }
    } catch {
      alert("No se pudo conectar con el servidor de pagos.");
    }
  };

  // ── Checkout WhatsApp ────────────────────────────────
  const checkoutWhatsApp = () => {
    if (items.length === 0) return;
    const lines = items
      .map((i) => `• ${i.name} (Talle: ${i.selectedSize ?? "S/T"}) x${i.quantity} — ${formatPrice(i.price * i.quantity)}`)
      .join("\n");
    const msg = encodeURIComponent(
      `Hola! Quiero hacer un pedido:\n\n${lines}\n\nTotal: ${formatPrice(totalPrice)}`
    );
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, "_blank");
  };

  const CartContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4
                      border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[22px]">shopping_bag</span>
          <h2 className="font-black text-xl uppercase tracking-tight">Carrito</h2>
          {totalItems > 0 && <span className="badge-cyan">{totalItems}</span>}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button onClick={clearCart}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors
                         px-2 py-1 rounded-lg hover:bg-red-500/10 font-bold uppercase tracking-wider">
              Vaciar
            </button>
          )}
          <button onClick={closeCart} aria-label="Cerrar carrito"
            className="p-2 rounded-xl text-gray-600 hover:text-white hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* Lista de ítems */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex flex-col items-center justify-center h-full py-16 text-center">
              <span className="material-symbols-outlined text-[56px] text-gray-800 mb-3">shopping_bag</span>
              <p className="font-black text-lg text-gray-400">Tu carrito está vacío</p>
              <p className="text-gray-700 text-sm mt-2">Agregá productos del catálogo</p>
              <button onClick={closeCart} className="mt-5 btn-primary text-xs py-2.5 px-6">
                Explorar Catálogo
              </button>
            </motion.div>
          ) : (
            items.map((item, index) => (
              <motion.div
                key={`${item.id}-${item.selectedSize}-${index}`}
                initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:16, height:0, marginBottom:0 }}
                transition={{ duration:0.2 }}
                className="glass-panel rounded-2xl p-3 flex gap-3"
              >
                {/* Imagen */}
                <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden bg-zinc-800 border border-white/8">
                  {item.image && item.image.startsWith("data:") ? (
                    <div className="relative w-full h-full">
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-contain p-1"
                        style={{ backgroundColor: item.designData?.tshirtColor || "#111" }} />
                      <span className="absolute bottom-0 right-0 text-[8px] font-black
                                       bg-secondary text-background px-1 rounded-tl-lg">3D</span>
                    </div>
                  ) : item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-600 text-[24px]">checkroom</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="font-black text-sm leading-snug line-clamp-1 text-white">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.selectedSize && (
                      <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">
                        Talle: {item.selectedSize}
                      </p>
                    )}
                    {item.isCustom && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full
                                       bg-secondary/20 text-secondary border border-secondary/30">
                        Personalizada
                      </span>
                    )}
                  </div>
                  <p className="text-primary font-black text-sm mt-1">{formatPrice(item.price)}</p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-surface rounded-xl overflow-hidden">
                      <button onClick={() => updateQty(index, item.quantity - 1)} aria-label="Reducir"
                        className="w-8 h-8 flex items-center justify-center text-gray-500
                                   hover:text-white hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="text-sm font-black text-white w-7 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(index, item.quantity + 1)} aria-label="Aumentar"
                        className="w-8 h-8 flex items-center justify-center text-gray-500
                                   hover:text-white hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                    <button onClick={() => removeItem(index)} aria-label="Eliminar"
                      className="text-gray-700 hover:text-red-400 transition-colors p-1">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer — total y botones de pago */}
      {items.length > 0 && (
        <div className="border-t border-white/8 px-5 pt-4 pb-5 space-y-3
                        bg-surface/40 backdrop-blur-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total</span>
            <span className="text-2xl font-black text-primary">{formatPrice(totalPrice)}</span>
          </div>
          <p className="text-xs text-gray-700">Envío calculado al finalizar la compra.</p>

          <button onClick={checkoutMP}
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider
                       bg-[#009ee3] hover:bg-[#0087c8] text-white
                       flex items-center justify-center gap-2
                       transition-all duration-200 hover:scale-[1.02] active:scale-95
                       shadow-[0_4px_20px_rgba(0,158,227,0.25)]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.75 16.5h-1.5v-4.5h1.5v4.5zm0-6h-1.5V9h1.5v1.5z"/>
            </svg>
            Pagar con MercadoPago
          </button>

          <button onClick={checkoutWhatsApp}
            className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider
                       bg-[#25d366] hover:bg-[#20bc5a] text-white
                       flex items-center justify-center gap-2
                       transition-all duration-200 hover:scale-[1.02] active:scale-95">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Consultar por WhatsApp
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div key="overlay"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.2 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[54]"
            aria-hidden />
        )}
      </AnimatePresence>

      {/* ── DESKTOP: drawer lateral ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside key="cart-desktop"
            initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
            transition={{ type:"spring", damping:28, stiffness:280 }}
            className="hidden md:flex fixed top-0 right-0 z-[55] w-full max-w-md
                       bg-background border-l border-white/8 flex-col h-full
                       shadow-[-8px_0_60px_rgba(0,0,0,0.8)]"
            role="dialog" aria-label="Carrito de compras"
          >
            <CartContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MOBILE: bottom sheet arrastrable hacia arriba ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div key="cart-mobile"
            initial={{ y:"100%" }}
            animate={{ y:0 }}
            exit={{ y:"100%" }}
            transition={{ type:"spring", damping:30, stiffness:300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top:0, bottom:0 }}
            dragElastic={{ top:0, bottom:0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) closeCart();
            }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[55]
                       bg-background border-t border-white/10 rounded-t-3xl
                       flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.7)]"
            style={{ maxHeight:"90dvh" }}
            role="dialog" aria-label="Carrito de compras"
          >
            {/* Handle arrastrable */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>
            <p className="text-center text-[10px] text-gray-700 font-bold pb-2 flex-shrink-0">
              Arrastrá hacia abajo para cerrar
            </p>

            <CartContent />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
