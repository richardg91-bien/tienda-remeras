import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    icon:  "photo_library",
    color: "text-primary",
    title: "Elegí un diseño",
    desc:  "Explorá el banco de más de 500 imágenes o usá tu propio texto en la pestaña Biblioteca.",
    hint:  "Pestaña → Biblioteca",
  },
  {
    icon:  "palette",
    color: "text-secondary",
    title: "Elegí el color",
    desc:  "Cambiá el color de la remera con un solo click en la sección Herramientas.",
    hint:  "Pestaña → Herramientas → Color remera",
  },
  {
    icon:  "shopping_cart",
    color: "text-tertiary",
    title: "Agregá al carrito",
    desc:  "Cuando estés conforme, hacé click en 'Agregar al carrito' y elegí el talle.",
    hint:  "Botón verde abajo del panel",
  },
];

const STORAGE_KEY = "neon-stitch-studio-onboarding-v1";

export default function StudioOnboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);

  useEffect(() => {
    // Solo muestra la primera vez
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Pequeño delay para que el Studio cargue
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-8 md:inset-auto md:left-1/2 md:top-1/2
                       md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px]
                       bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden z-[61]
                       shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
          >
            {/* Barra de progreso */}
            <div className="flex gap-1 p-4 pb-0">
              {STEPS.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-primary" : "bg-white/10"
                }`} />
              ))}
            </div>

            {/* Contenido */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="p-6"
              >
                {/* Ícono */}
                <div className="w-14 h-14 rounded-2xl glass-panel flex items-center justify-center mb-4">
                  <span className={`material-symbols-outlined text-[28px] ${STEPS[step].color}`}>
                    {STEPS[step].icon}
                  </span>
                </div>

                {/* Número */}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">
                  Paso {step + 1} de {STEPS.length}
                </p>

                {/* Título */}
                <h3 className="font-black text-2xl mb-2">{STEPS[step].title}</h3>

                {/* Descripción */}
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{STEPS[step].desc}</p>

                {/* Hint */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                  <span className="material-symbols-outlined text-[14px] text-primary">tips_and_updates</span>
                  <p className="text-[11px] text-gray-400 font-bold">{STEPS[step].hint}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-6 pt-2">
              <button onClick={handleClose}
                className="text-xs text-gray-600 hover:text-white transition-colors font-bold">
                Saltar tour
              </button>
              <button onClick={handleNext}
                className="btn-primary text-xs py-2.5 px-6">
                {step < STEPS.length - 1 ? (
                  <>Siguiente <span className="material-symbols-outlined text-[16px]">arrow_forward</span></>
                ) : (
                  <>¡Empezar! <span className="material-symbols-outlined text-[16px]">design_services</span></>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
