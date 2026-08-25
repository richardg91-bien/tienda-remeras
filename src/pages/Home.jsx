import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Hero from "../components/Hero";
import Products from "../components/Products";
import StyleQuiz from "../components/StyleQuiz";
import { products } from "../data/products";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

// ── Sección de Features ──────────────────────────────────────────────────────
const features = [
  {
    icon: "psychology",
    color: "text-secondary",
    label: "Materiales Avanzados",
    title: "Tejidos Reactivos",
    desc: "Textiles inteligentes que regulan la temperatura y responden a estímulos lumínicos.",
  },
  {
    icon: "auto_awesome",
    color: "text-primary",
    label: "Corte Generativo",
    title: "Patrones por IA",
    desc: "Cortes calculados algorítmicamente para un ajuste ergonómico perfecto en cualquier cuerpo.",
  },
  {
    icon: "speed",
    color: "text-tertiary",
    label: "Envío Rápido",
    title: "48hs en CABA",
    desc: "Logística optimizada. Tu prenda llega antes de que el hype se enfríe.",
  },
  {
    icon: "verified",
    color: "text-primary",
    label: "Calidad Garantizada",
    title: "Control Total",
    desc: "Cada prenda pasa por inspección de calidad antes de salir del depósito.",
  },
];

// ── Testimonios ──────────────────────────────────────────────────────────────
const testimonials = [
  {
    name: "Lucas M.",
    handle: "@lmstreet",
    text: "La calidad es otro nivel. Compré la Neural Web Tee y literalmente la gente me para en la calle.",
    rating: 5,
    tag: "Cyberpunk",
  },
  {
    name: "Valentina R.",
    handle: "@val.drops",
    text: "El quiz de IA me recomendó la Genesis Drop 01 y es exactamente lo que buscaba. Increíble.",
    rating: 5,
    tag: "Génesis",
  },
  {
    name: "Mateo G.",
    handle: "@mateo.g",
    text: "Minimalista sin ser aburrido. La Void Minimal Tee va con todo. Ya compré 3 colores.",
    rating: 5,
    tag: "Minimalista",
  },
];

export default function Home() {
  const [showQuiz, setShowQuiz] = useState(false);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

  return (
    <div className="bg-background text-white min-h-screen">

      {/* ── Hero ── */}
      <Hero />

      {/* ── Features / Precisión Algorítmica ── */}
      <section id="features" className="px-6 py-24 max-w-7xl mx-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-12"
        >
          <motion.p variants={fadeUp} className="section-label mb-2">
            Tecnología
          </motion.p>
          <motion.h2 variants={fadeUp} className="section-title neon-border-left">
            Precisión Algorítmica
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="glass-panel rounded-3xl p-6 hover:border-primary/20 transition-all duration-300
                         hover:-translate-y-1 group"
            >
              <span className={`material-symbols-outlined text-[32px] ${f.color} mb-3 block
                               group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-1">
                {f.label}
              </p>
              <h3 className="text-lg font-black text-white mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Best Sellers ── */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <motion.p variants={fadeUp} className="section-label mb-2">Tendencia</motion.p>
            <motion.h2 variants={fadeUp} className="section-title">
              Best<br />
              <span className="text-gradient-neon">Sellers</span>
            </motion.h2>
          </div>
          <motion.div variants={fadeUp}>
            <Link to="/catalogo" className="btn-outline py-2.5 px-5 text-xs hidden md:inline-flex">
              Ver todo
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </motion.div>
        </motion.div>

        <Products products={bestSellers} title="" />

        <div className="mt-8 text-center md:hidden">
          <Link to="/catalogo" className="btn-outline py-2.5 px-6 text-xs">
            Ver catálogo completo
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* ── Banner IA / Quiz ── */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative glass-panel-accent rounded-[2.5rem] p-10 md:p-16 overflow-hidden"
        >
          {/* Fondo decorativo */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/6 blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-secondary/6 blur-[60px]" />
            <div className="absolute inset-0 bg-dots opacity-30" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="section-label mb-3">Inteligencia Artificial</p>
              <h2 className="section-title mb-4">
                ¿Cuál es<br />
                <span className="text-gradient-neon">tu estilo?</span>
              </h2>
              <p className="text-gray-400 max-w-md text-base leading-relaxed">
                Nuestro algoritmo analiza tus preferencias y te recomienda las prendas
                perfectas para vos. Solo toma 30 segundos.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => setShowQuiz(true)}
                className="btn-primary"
              >
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                Iniciar Quiz IA
              </button>
              <Link to="/catalogo" className="btn-outline">
                Ver Catálogo
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Testimonios ── */}
      <section className="px-6 py-16 max-w-7xl mx-auto" id="info">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-10"
        >
          <motion.p variants={fadeUp} className="section-label mb-2">Comunidad</motion.p>
          <motion.h2 variants={fadeUp} className="section-title">
            Lo que dicen<br />
            <span className="text-gradient-neon">ellos</span>
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-5"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="glass-panel rounded-3xl p-6 hover:border-primary/20 transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-primary text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-white text-sm">{t.name}</p>
                  <p className="text-gray-600 text-xs">{t.handle}</p>
                </div>
                <span className="badge-cyan">{t.tag}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 px-6 py-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-2xl font-black italic text-primary tracking-tighter">NEON-STITCH</p>
            <p className="text-gray-600 text-xs mt-1">Diseño por IA, Estilo Humano.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600 font-bold uppercase tracking-wider">
            <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
            <Link to="/catalogo" className="hover:text-primary transition-colors">Catálogo</Link>
            <a href="#info" className="hover:text-primary transition-colors">Info</a>
          </div>
          <p className="text-gray-700 text-xs">© 2026 NEON-STITCH. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ── Modal Quiz ── */}
      <AnimatePresence>
        {showQuiz && <StyleQuiz onClose={() => setShowQuiz(false)} />}
      </AnimatePresence>
    </div>
  );
}
