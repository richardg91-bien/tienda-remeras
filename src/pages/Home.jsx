import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Hero from "../components/Hero";
import Products from "../components/Products";
import StyleQuiz from "../components/StyleQuiz";
import { useAuth } from "../context/AuthContext";
import { products, formatPrice } from "../data/products";
import BrandMark from "../components/BrandMark.jsx";

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
    icon: "design_services",
    color: "text-secondary",
    label: "Lienzo editable",
    title: "Diseñá en 2D",
    desc: "Sumá imágenes y textos, y ajustá cada elemento sobre el área de trabajo.",
  },
  {
    icon: "view_in_ar",
    color: "text-primary",
    label: "Vista interactiva",
    title: "Explorá en 3D",
    desc: "Rotá y acercá el producto para revisar tu propuesta desde distintos ángulos.",
  },
  {
    icon: "photo_library",
    color: "text-tertiary",
    label: "Recursos creativos",
    title: "Reutilizá tus ideas",
    desc: "Explorá la biblioteca y retomá tus proyectos guardados desde el diseñador.",
  },
  {
    icon: "straighten",
    color: "text-primary",
    label: "Referencia visual",
    title: "Medidas a la vista",
    desc: "Consultá guías de impresión orientativas sin convertirlas en límites del diseño.",
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
  const { isAuthenticated }     = useAuth();
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

  // Si está autenticado va al catálogo, si no va a registro
  const ctaLink = isAuthenticated ? "/catalogo" : "/register";

  return (
    <div className="bg-background text-slate-800 min-h-screen">

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
            Diseñá a tu manera
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
            <Link to={ctaLink} className="btn-outline py-2.5 px-5 text-xs hidden md:inline-flex">
              Ver todo
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </motion.div>
        </motion.div>

        <Products products={bestSellers} title="" />

        <div className="mt-8 text-center md:hidden">
          <Link to={ctaLink} className="btn-outline py-2.5 px-6 text-xs">
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
              <Link to={ctaLink} className="btn-outline">
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

      {/* ── Sección IA visible ── */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <div className="relative glass-panel-accent rounded-[2.5rem] overflow-hidden">
          {/* Fondo decorativo */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-secondary/8 blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary/8 blur-[80px]" />
            <div className="absolute inset-0 bg-grid opacity-30" />
          </div>

          <div className="relative z-10 grid md:grid-cols-2 gap-0 items-stretch">
            {/* Copy */}
            <div className="p-10 md:p-12 flex flex-col justify-center">
              <motion.div initial="hidden" whileInView="show" viewport={{ once:true }}
                variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.1 } } }}>
                <motion.p variants={fadeUp} className="section-label mb-3">
                  Inteligencia Artificial
                </motion.p>
                <motion.h2 variants={fadeUp} className="section-title mb-4">
                  Describí tu idea,<br />
                  <span className="text-gradient-neon">la IA la crea</span>
                </motion.h2>
                <motion.p variants={fadeUp} className="text-gray-400 mb-6 leading-relaxed">
                  Nuestro asistente IA entiende tu estilo y te recomienda diseños, talles y combinaciones en segundos. Como tener un diseñador personal.
                </motion.p>
                <motion.div variants={fadeUp} className="flex flex-col gap-3">
                  {[
                    { icon: "psychology",    text: "\"Quiero algo cyberpunk para el verano\"" },
                    { icon: "straighten",    text: "\"¿Qué talle me queda si peso 75kg?\"" },
                    { icon: "auto_awesome",  text: "\"Mostrámé los best sellers de streetwear\"" },
                  ].map((q, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 glass-panel rounded-xl">
                      <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">
                        {q.icon}
                      </span>
                      <p className="text-sm text-gray-300 italic">{q.text}</p>
                    </div>
                  ))}
                </motion.div>
                <motion.div variants={fadeUp} className="mt-6">
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Asistente disponible ahora — hacé click en el botón
                    <span className="material-symbols-outlined text-primary text-[14px]">psychology</span>
                  </p>
                </motion.div>
              </motion.div>
            </div>

            {/* Visual del chat */}
            <div className="hidden md:flex flex-col justify-center p-8 border-l border-white/8">
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                {/* Mensaje usuario */}
                <div className="flex justify-end">
                  <div className="bg-primary text-background font-bold text-sm px-4 py-2.5
                                  rounded-2xl rounded-tr-sm max-w-[200px]">
                    Quiero algo cyberpunk
                  </div>
                </div>
                {/* Respuesta IA */}
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center
                                  text-background text-[10px] font-black flex-shrink-0">AI</div>
                  <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 max-w-[220px]">
                    Para estilo <strong className="text-white">CYBERPUNK</strong> te recomiendo:
                  </div>
                </div>
                {/* Mini cards de productos */}
                {products.filter(p => p.category === "Cyberpunk").slice(0,2).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 glass-panel rounded-xl ml-9">
                    <img src={p.image} alt={p.name}
                      className="w-10 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white line-clamp-1">{p.name}</p>
                      <p className="text-xs text-primary font-black">{formatPrice(p.price)}</p>
                    </div>
                  </div>
                ))}
                {/* Typing indicator */}
                <div className="flex items-center gap-2 ml-9">
                  <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    {[0,1,2].map(i => (
                      <motion.span key={i} animate={{ y:[0,-4,0] }}
                        transition={{ repeat:Infinity, duration:0.8, delay:i*0.15 }}
                        className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-5 py-16 sm:px-8 md:py-20">
        <div className="glass-panel-accent mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] p-6 sm:p-10 md:grid-cols-[1fr_auto] md:p-14">
          <div>
            <p className="section-label mb-3">Sobre nosotros</p>
            <h2 className="section-title mb-4">
              Una creación<br />
              <span className="text-gradient-holo">de RichardG91</span>
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              ANATHEL Design es un espacio independiente para imaginar y personalizar prendas.
              Reúne herramientas de diseño, recursos y vistas interactivas para que cada persona
              pueda llevar una idea a su propio proyecto.
            </p>
            <p className="mt-5 font-semibold text-slate-700">Tu creatividad. Sin límites.</p>
          </div>
          <div className="flex justify-start md:justify-center">
            <BrandMark />
          </div>
        </div>
      </section>

      {/* ── Modal Quiz ── */}
      <AnimatePresence>
        {showQuiz && <StyleQuiz onClose={() => setShowQuiz(false)} />}
      </AnimatePresence>
    </div>
  );
}
