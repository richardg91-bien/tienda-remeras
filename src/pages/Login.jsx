import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Login() {
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || "/perfil";

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">

      {/* Fondo decorativo */}
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
                        rounded-full bg-primary/6 blur-[100px]" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-black italic text-primary tracking-tighter mb-6">
            NEON-STITCH
          </Link>
          <h1 className="text-3xl font-black uppercase">Iniciá sesión</h1>
          <p className="text-gray-500 text-sm mt-2">Accedé a tu cuenta para continuar</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-8">

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30
                         text-red-400 text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                 text-gray-600 text-[18px] pointer-events-none">
                  mail
                </span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  className="input-dark pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                 text-gray-600 text-[18px] pointer-events-none">
                  lock
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="input-dark pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-600 hover:text-white transition-colors"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPass ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed
                         disabled:scale-100"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-background border-t-transparent
                                   rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Iniciar sesión
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-gray-700 font-bold uppercase tracking-wider">o</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Link a registro */}
          <p className="text-center text-sm text-gray-500">
            ¿No tenés cuenta?{" "}
            <Link
              to="/register"
              className="text-primary font-bold hover:underline"
            >
              Registrate
            </Link>
          </p>
        </motion.div>

        {/* Volver */}
        <motion.div variants={fadeUp} className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-600 hover:text-white transition-colors
                                  flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Volver al inicio
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
