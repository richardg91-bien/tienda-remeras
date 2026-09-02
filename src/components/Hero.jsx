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

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">

          {/* ── Copy ── */}
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="flex flex-col items-start">

            <motion.div variants={fadeIn} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                               border border-primary/30 text-primary text-[11px] font-black
                               uppercase tracking-[0.3em] glass-panel">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Colección Génesis 2026
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="text-6xl md:text-7xl xl:text-8xl font-black uppercase leading-none tracking-tight">
              Diseñá tu<br />
              <span className="text-primary">remera</span><br />
              en 3D
            </motion.h1>

            <motion.p variants={fadeUp}
              className="text-gray-400 max-w-md mt-6 text-lg leading-relaxed">
              Personalizá cada detalle. Usá el editor 3D interactivo, el banco de imágenes y la IA para crear la remera exacta que imaginás.
            </motion.p>

            {/* Stats */}
            <motion.div variants={fadeUp} className="flex items-center gap-8 mt-8">
              {[
                { value: "500+", label: "Clientes" },
                { value: "514",  label: "Diseños" },
                { value: "48hs", label: "Envío" },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-black text-primary">{stat.value}</p>
                  <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mt-10">
              <Link to="/register" className="btn-primary text-sm px-8 py-4">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                Empezar gratis
              </Link>
              <Link to="/login" className="btn-outline text-sm px-8 py-4">
                <span className="material-symbols-outlined text-[20px]">login</span>
                Ya tengo cuenta
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 mt-8">
              <div className="flex -space-x-2">
                {["1521572163474-6864f9cf17ab","1503341455253-b2e723bb3dbb","1618354691373-d851c5c3a990"].map((id,i) => (
                  <img key={i}
                    src={`https://images.unsplash.com/photo-${id}?w=40&h=40&fit=crop&crop=face`}
                    alt="" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({length:5}).map((_,i) => (
                    <svg key={i} className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">+500 clientes satisfechos</p>
              </div>
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
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Design Studio</p>
              <p className="text-xs font-bold text-white mt-1">Editor 3D en tiempo real</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-8 left-4 glass-panel-accent rounded-2xl px-4 py-3"
            >
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest">IA Integrada</p>
              <p className="text-xs font-bold text-white mt-1">Diseño por inteligencia artificial</p>
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
