import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { products, styleRecommendations, formatPrice } from "../data/products";
import { useCart } from "../context/CartContext";

// ── Motor de respuestas ──────────────────────────────────────────────────────
function getAIResponse(input) {
  const text = input.toLowerCase().trim();

  const styleMap = {
    cyberpunk:   ["cyberpunk", "cyber", "hack", "glitch", "neon", "tech"],
    minimalista: ["minimalista", "minimal", "simple", "clean", "básico", "básica"],
    genesis:     ["genesis", "génesis", "exclusivo", "primer", "drop"],
    premium:     ["premium", "calidad", "lujoso", "fino", "exclusivo"],
    streetwear:  ["street", "streetwear", "skate", "urbano", "hiphop"],
    oversize:    ["oversize", "grande", "holgado", "amplio"],
    anime:       ["anime", "manga", "otaku"],
  };

  for (const [style, keywords] of Object.entries(styleMap)) {
    if (keywords.some((kw) => text.includes(kw))) {
      const ids  = styleRecommendations[style] || [];
      const recs = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
      return {
        type: "recommendations",
        message: `Para el estilo **${style.toUpperCase()}** te recomiendo:`,
        products: recs,
      };
    }
  }

  if (text.match(/talle|talla|size|medida|soy|peso|mido|cm|kg/)) {
    return {
      type: "text",
      message:
        "**Guía de talles NEON-STITCH:**\n\n" +
        "• **XS** → hasta 60kg / talle 36-38\n" +
        "• **S** → 60-70kg / talle 38-40\n" +
        "• **M** → 70-80kg / talle 40-42\n" +
        "• **L** → 80-90kg / talle 42-44\n" +
        "• **XL** → 90-100kg / talle 44-46\n" +
        "• **XXL** → +100kg / talle 46+\n\n" +
        "Para look oversize: subí un talle. Para fit slim: bajá uno.",
    };
  }

  if (text.match(/envío|envio|entrega|tiempo|demora|cuánto tarda/)) {
    return {
      type: "text",
      message:
        "**Envíos NEON-STITCH:**\n\n" +
        "• CABA y GBA → 1-2 días hábiles\n" +
        "• Interior → 3-5 días hábiles\n" +
        "• Envío gratis en compras +$30.000\n\n" +
        "Correo Argentino o Andreani según destino.",
    };
  }

  if (text.match(/pago|cuota|tarjeta|efectivo|mercadopago|mp|precio/)) {
    return {
      type: "text",
      message:
        "**Medios de pago:**\n\n" +
        "• Tarjeta débito/crédito (hasta 6 cuotas sin interés)\n" +
        "• MercadoPago\n" +
        "• Transferencia (5% de descuento)\n" +
        "• Efectivo al retirar\n\n" +
        "El precio mostrado es en efectivo/transferencia.",
    };
  }

  if (text.match(/hola|buenas|hey|hi|saludos|inicio/)) {
    return {
      type: "text",
      message:
        "**Bienvenido a NEON-STITCH** 👾\n\n" +
        "Soy tu asistente de estilo IA. Puedo ayudarte con:\n\n" +
        "• **Recomendaciones** por estilo\n" +
        "• **Talles** y medidas\n" +
        "• **Envíos** y medios de pago\n\n" +
        "¿Por dónde arrancamos?",
    };
  }

  if (text.match(/ia|analizado|inteligencia|algoritmo/)) {
    const aiProducts = products.filter((p) => p.aiAnalyzed).slice(0, 3);
    return {
      type: "recommendations",
      message: "Prendas analizadas y optimizadas por nuestra IA:",
      products: aiProducts,
    };
  }

  if (text.match(/ver|catálogo|catalogo|todo|todos|productos/)) {
    return {
      type: "recommendations",
      message: "Algunos productos destacados de la colección:",
      products: products.filter((p) => p.isBestSeller).slice(0, 3),
    };
  }

  return {
    type: "text",
    message:
      "No logré procesar esa consulta. 🤖\n\n" +
      "Podés preguntarme sobre:\n" +
      "• Un estilo → *\"busco algo cyberpunk\"*\n" +
      "• Talles → *\"¿qué talle me queda?\"*\n" +
      "• Info → *\"¿cuánto tarda el envío?\"*",
  };
}

// ── Mensaje individual ───────────────────────────────────────────────────────
function Message({ msg, onAddToCart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      {msg.role === "ai" && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center
                        text-background text-[10px] font-black flex-shrink-0 mt-0.5">
          AI
        </div>
      )}

      <div className="max-w-[86%]">
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
            msg.role === "user"
              ? "bg-primary text-background font-bold rounded-tr-sm"
              : "glass-panel text-gray-200 rounded-tl-sm"
          }`}
          dangerouslySetInnerHTML={{
            __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>"),
          }}
        />

        {/* Cards de productos */}
        {msg.role === "ai" && msg.products?.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 glass-panel rounded-xl"
              >
                <img src={p.image} alt={p.name}
                     className="w-12 h-14 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white line-clamp-1">{p.name}</p>
                  <p className="text-xs text-primary font-black mt-0.5">{formatPrice(p.price)}</p>
                </div>
                <button
                  onClick={() => onAddToCart(p)}
                  className="text-xs bg-tertiary hover:opacity-90 text-background font-black
                             px-2.5 py-1.5 rounded-lg transition-opacity flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AIAssistant() {
  const [isOpen, setIsOpen]     = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "**Bienvenido a NEON-STITCH** 👾\n¿Te ayudo a encontrar tu prenda ideal?",
      products: [],
    },
  ]);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);
  const { addItem, openCart } = useCart();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleAddToCart = (product) => {
    addItem(product, product.sizes[0]);
    openCart();
  };

  const sendMessage = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setMessages((prev) => [...prev, { role: "user", content: msg, products: [] }]);
    setInput("");
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
    const response = getAIResponse(msg);
    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: response.message, products: response.products || [] },
    ]);
  };

  const quickReplies = ["Algo cyberpunk", "Talles", "Envíos", "Best sellers"];

  return (
    <>
      {/* Botón flotante */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Asistente IA"
        className="fixed bottom-24 right-5 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full
                   bg-primary text-background flex items-center justify-center neon-glow"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span key="close"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}
              className="material-symbols-outlined text-[24px]">
              close
            </motion.span>
          ) : (
            <motion.span key="chat"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.2 }}
              className="material-symbols-outlined text-[24px]">
              psychology
            </motion.span>
          )}
        </AnimatePresence>

        {!isOpen && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full
                           bg-secondary border-2 border-background animate-pulse" />
        )}
      </motion.button>

      {/* Panel del chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed bottom-40 right-5 md:bottom-24 md:right-6 z-50
                       w-[340px] max-h-[500px] bg-background border border-white/10
                       rounded-3xl flex flex-col overflow-hidden
                       shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8
                            bg-surface/80 backdrop-blur-xl">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center
                              text-background text-[11px] font-black neon-glow-sm">
                AI
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Asistente NEON-STITCH</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-gray-600 font-bold">En línea</span>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <Message key={i} msg={msg} onAddToCart={handleAddToCart} />
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center
                                  text-background text-[10px] font-black flex-shrink-0">
                    AI
                  </div>
                  <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        className="w-1.5 h-1.5 rounded-full bg-gray-500"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {quickReplies.map((r) => (
                <button key={r} onClick={() => sendMessage(r)}
                  className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full
                             border border-white/10 text-gray-500 hover:border-primary/50
                             hover:text-primary transition-colors whitespace-nowrap font-bold uppercase tracking-wider">
                  {r}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-white/8">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                  placeholder="Escribí tu consulta..."
                  className="flex-1 bg-surface border border-white/10 rounded-xl
                             px-3 py-2.5 text-sm text-white placeholder-gray-700
                             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                             transition-colors"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  aria-label="Enviar"
                  className="w-10 h-10 rounded-xl bg-primary hover:opacity-90 text-background
                             flex items-center justify-center flex-shrink-0
                             transition-all duration-200 hover:scale-105 active:scale-95
                             disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
