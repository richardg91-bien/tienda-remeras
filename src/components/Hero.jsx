import { lazy, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Three.js + R3F + el modelo GLB viven en este chunk:
// solo se descargan cuando el hero entra en pantalla.
const Hero3D = lazy(() => import("./Hero3D.jsx"));

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5 } },
};

/**
 * Escena 3D del hero — se monta solo cuando es visible en pantalla,
 * para no bloquear el primer render con Three.js.
 */
function Hero3DOnVisible() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {visible && <Hero3D />}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">

      {/* ── Fondo ── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-40" />
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute top-1/4 right-[-5%] w-[350px] h-[350px] rounded-full bg-secondary/6 blur-[100px]" />
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <motion.div
            animate={{ y: ["0vh", "100vh"] }}
            transition={{ repeat: Infinity, duration: 5, ease: "linear", repeatDelay: 2 }}
            className="h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">

          {/* ── Copy ── */}
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="flex min-w-0 flex-col items-start">

            <motion.div variants={fadeIn} className="mb-6">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border
                               border-primary/30 px-3 py-1.5 text-[9px] font-black uppercase
                               tracking-[0.12em] text-primary glass-panel sm:px-4 sm:text-[11px]
                               sm:tracking-[0.3em]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ANATHEL Design · Estudio creativo
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="w-full break-words text-[clamp(2rem,4.5vw,4.5rem)] font-black uppercase leading-none tracking-tight">
              Tu creatividad.<br />
              <span className="text-gradient-holo">Sin límites.</span>
            </motion.h1>

            <motion.p variants={fadeUp}
              className="mt-6 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              Diseñá y personalizá prendas con herramientas 2D y 3D, recursos creativos y medidas de impresión a la vista.
            </motion.p>

            {/* Stats */}
            <motion.div variants={fadeUp} className="mt-8 flex w-full flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-8">
              {[
                { value: "2D", label: "Diseño editable" },
                { value: "3D", label: "Vista interactiva" },
                { value: "CM", label: "Medidas visibles" },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-black text-gradient-holo">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link to="/register" className="btn-primary w-full justify-center px-6 py-4 text-sm sm:w-auto sm:px-8">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                Crear cuenta
              </Link>
              <Link to="/login" className="btn-outline w-full justify-center px-6 py-4 text-sm sm:w-auto sm:px-8">
                <span className="material-symbols-outlined text-[20px]">login</span>
                Iniciar sesión
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 border-l-2 border-secondary pl-4">
              <p className="text-xs font-bold tracking-wide text-slate-600">
                ANATHEL Design <span className="mx-1 text-slate-300">/</span> Creado por RichardG91
              </p>
              <p className="mt-1 text-xs text-slate-500">Una idea propia, hecha para crear sin límites.</p>
            </motion.div>
          </motion.div>

          {/* ── Modelo 3D ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative h-[500px] lg:h-[600px]"
          >
            {/* Halo neon */}
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-[80px] scale-75
                            pointer-events-none animate-glow-pulse-cyan" />

            <Hero3DOnVisible />

            {/* Label flotante */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="absolute top-8 right-4 glass-panel-accent rounded-2xl px-4 py-3 max-w-[160px]"
            >
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">ANATHEL Studio</p>
              <p className="text-xs font-bold text-slate-800 mt-1">Editor 3D interactivo</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-8 left-4 glass-panel-accent rounded-2xl px-4 py-3"
            >
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest">IA Integrada</p>
              <p className="text-xs font-bold text-slate-800 mt-1">Asistencia creativa integrada</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
          <div className="w-1 h-2 rounded-full bg-primary/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
