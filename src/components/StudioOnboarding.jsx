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
          {/* Overlay — click para cerrar */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          />

          {/* Modal — centrado siempre */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[calc(100vw-32px)] max-w-[400px]
                       bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden
                       z-[61] shadow-[0_24px_80px_rgba(0,0,0,0.9)]"
          >
            {/* Header con botón cerrar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              {/* Barra de progreso */}
              <div className="flex gap-1.5 flex-1 mr-4">
                {STEPS.map((_, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    i <= step ? "bg-primary" : "bg-white/10"
                  }`} />
                ))}
              </div>
              {/* Botón X siempre visible */}
              <button
                onClick={handleClose}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-full glass-panel flex items-center justify-center
                           text-gray-500 hover:text-white transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
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
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mb-4">
                  <span className={`material-symbols-outlined text-[24px] ${STEPS[step].color}`}>
                    {STEPS[step].icon}
                  </span>
                </div>

                {/* Número */}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">
                  Paso {step + 1} de {STEPS.length}
                </p>

                {/* Título */}
                <h3 className="font-black text-xl mb-2">{STEPS[step].title}</h3>

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
            <div className="flex items-center justify-between px-6 pb-5 pt-1">
              <button onClick={handleClose}
                className="text-xs text-gray-600 hover:text-white transition-colors font-bold uppercase tracking-wider">
                Saltar
              </button>
              <button onClick={handleNext} className="btn-primary text-xs py-2.5 px-5">
                {step < STEPS.length - 1 ? (
                  <>Siguiente <span className="material-symbols-outlined text-[15px]">arrow_forward</span></>
                ) : (
                  <>¡Empezar! <span className="material-symbols-outlined text-[15px]">design_services</span></>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
