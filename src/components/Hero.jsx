import { motion } from "framer-motion";
import { Link } from "react-router-dom";

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

export default function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-background">

      {/* ── Fondo animado / shader simulado ── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {/* Gradiente radial cyan superior */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-40" />
        {/* Orbe cyan izquierda */}
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full
                        bg-primary/6 blur-[120px]" />
        {/* Orbe purple derecha */}
        <div className="absolute top-1/4 right-[-5%] w-[350px] h-[350px] rounded-full
                        bg-secondary/6 blur-[100px]" />
        {/* Grid sutil */}
        <div className="absolute inset-0 bg-grid opacity-100" />
        {/* Scan line animada */}
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden pointer-events-none">
          <motion.div
            animate={{ y: ["0vh", "80vh"] }}
            transition={{ repeat: Infinity, duration: 5, ease: "linear", repeatDelay: 2 }}
            className="h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="relative z-10 text-center px-6 py-24 max-w-3xl mx-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          {/* Chip colección */}
          <motion.div variants={fadeIn} className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                             border border-primary/30 text-primary text-[11px] font-black
                             uppercase tracking-[0.3em] glass-panel">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Colección Génesis
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl font-black uppercase leading-none mb-6 tracking-tight"
          >
            El Futuro del
            <br />
            <span className="text-primary neon-glow-sm" style={{ WebkitTextStroke: "0px" }}>
              Streetwear
            </span>
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            variants={fadeUp}
            className="text-gray-400 max-w-md mx-auto mb-10 text-lg leading-relaxed"
          >
            Diseño por IA, Estilo Humano. Prendas hiper-optimizadas con materiales de precisión técnica.
          </motion.p>

          {/* Stats */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-8 mb-10">
            {[
              { value: "500+", label: "Clientes" },
              { value: "IA",   label: "Analizado" },
              { value: "48hs", label: "Envío" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-black text-primary">{stat.value}</p>
                <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
            <Link to="/catalogo" className="btn-primary text-[0.8rem]">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Explorar Colección
            </Link>
            <Link to="/catalogo" className="btn-outline text-[0.8rem]">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              Ver Lab de IA
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Imagen flotante de producto (derecha, solo desktop) ── */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="relative"
        >
          {/* Halo neon detrás */}
          <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-[40px] scale-110" />

          {/* Card flotante */}
          <div className="relative glass-panel rounded-3xl overflow-hidden w-[260px]
                          border border-primary/20 shadow-[0_0_40px_rgba(0,242,255,0.12)]">
            <img
              src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=520&q=85"
              alt="Neural Web Tee"
              className="w-full h-[320px] object-cover"
            />
            <div className="p-4 border-t border-white/8">
              <p className="text-[10px] font-black text-primary tracking-widest uppercase mb-1">
                IA Analizado
              </p>
              <p className="font-black text-base text-white">Neural Web Tee</p>
              <p className="text-primary font-black text-sm mt-0.5">$12.000</p>
            </div>
          </div>

          {/* Badge */}
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 220 }}
            className="absolute -top-3 -right-3 badge-solid px-3 py-1.5"
          >
            New Drop
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 rounded-full bg-primary/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
