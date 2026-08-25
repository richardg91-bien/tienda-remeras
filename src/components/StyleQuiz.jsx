import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { products, styleRecommendations, formatPrice } from "../data/products";
import { useCart } from "../context/CartContext";

const steps = [
  {
    id: "mood",
    question: "¿Cómo te describís?",
    options: [
      { label: "Minimalista", value: "minimalista", emoji: "🤍" },
      { label: "Urbano",      value: "urbano",      emoji: "🏙️" },
      { label: "Streetwear",  value: "streetwear",  emoji: "🛹" },
      { label: "Premium",     value: "premium",     emoji: "✨" },
    ],
  },
  {
    id: "fit",
    question: "¿Qué corte preferís?",
    options: [
      { label: "Oversize",    value: "oversize",     emoji: "📦" },
      { label: "Regular",     value: "regular",      emoji: "👕" },
      { label: "Slim fit",    value: "slim",         emoji: "✂️" },
      { label: "Crop",        value: "crop",         emoji: "🔲" },
    ],
  },
  {
    id: "color",
    question: "¿Cuál es tu color favorito?",
    options: [
      { label: "Negro",       value: "negro",        emoji: "🖤" },
      { label: "Blanco",      value: "blanco",       emoji: "🤍" },
      { label: "Gris",        value: "gris",         emoji: "🩶" },
      { label: "Verde",       value: "verde",        emoji: "💚" },
    ],
  },
];

export default function StyleQuiz({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers]         = useState({});
  const [results, setResults]         = useState(null);
  const { addItem, openCart }         = useCart();

  const handleAnswer = (stepId, value) => {
    const newAnswers = { ...answers, [stepId]: value };
    setAnswers(newAnswers);

    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Calcular resultados
      const style     = newAnswers.mood || "minimalista";
      const fitPref   = newAnswers.fit;
      const ids       = styleRecommendations[style] || styleRecommendations.minimalista;

      let recs = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);

      // Filtro extra por fit si corresponde
      if (fitPref === "oversize") {
        const overRecs = styleRecommendations.oversize.map((id) => products.find((p) => p.id === id)).filter(Boolean);
        recs = [...new Map([...recs, ...overRecs].map((p) => [p.id, p])).values()].slice(0, 3);
      }

      setResults(recs.slice(0, 3));
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setAnswers({});
    setResults(null);
  };

  const progress = ((currentStep) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden
                   shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="font-display font-black text-lg">Quiz de estilo</h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Barra de progreso */}
          {!results && (
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            {!results ? (
              /* Pregunta actual */
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs text-zinc-500 font-medium mb-2">
                  Pregunta {currentStep + 1} de {steps.length}
                </p>
                <h3 className="font-display font-black text-2xl mb-6">
                  {steps[currentStep].question}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {steps[currentStep].options.map((opt) => (
                    <motion.button
                      key={opt.value}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(steps[currentStep].id, opt.value)}
                      className="p-4 rounded-2xl border border-zinc-700 hover:border-green-500
                                 bg-zinc-900/60 hover:bg-green-500/10
                                 text-left transition-all duration-200 group"
                    >
                      <span className="text-2xl block mb-2">{opt.emoji}</span>
                      <span className="font-semibold text-sm text-zinc-200 group-hover:text-white">
                        {opt.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Resultados */
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-center mb-6">
                  <span className="text-4xl block mb-3">🎉</span>
                  <h3 className="font-display font-black text-2xl mb-1">Tu selección ideal</h3>
                  <p className="text-zinc-400 text-sm">
                    Basado en tus respuestas, estas son tus remeras:
                  </p>
                </div>

                <div className="space-y-3">
                  {results.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 bg-zinc-900 rounded-2xl border border-zinc-800"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-14 h-16 object-cover rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-1">{product.name}</p>
                        <p className="text-green-400 font-bold text-sm mt-0.5">
                          {formatPrice(product.price)}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                          {product.sizes.slice(0, 4).map((s) => (
                            <span key={s} className="text-[10px] border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          addItem(product, product.sizes[1] || product.sizes[0]);
                          openCart();
                        }}
                        className="flex-shrink-0 bg-green-500 hover:bg-green-400 text-black
                                   font-bold text-xs px-3 py-2 rounded-xl transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={restart}
                    className="flex-1 btn-outline py-2.5 text-sm"
                  >
                    Repetir quiz
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 btn-primary py-2.5 text-sm"
                  >
                    Ver catálogo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
