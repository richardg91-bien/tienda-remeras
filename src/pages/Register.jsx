import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Register() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    password: "", confirmPassword: "", phone: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep]       = useState(1); // 1: datos personales, 2: credenciales

  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Nombre y apellido son obligatorios.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
      setError("La contraseña debe tener letras y números.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/perfil", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">

      {/* Fondo */}
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
                        rounded-full bg-secondary/6 blur-[100px]" />
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
          <h1 className="text-3xl font-black uppercase">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-2">Unite a la comunidad NEON-STITCH</p>
        </motion.div>

        {/* Barra de pasos */}
        <motion.div variants={fadeUp} className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              s <= step ? "bg-primary" : "bg-white/10"
            }`} />
          ))}
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

          {/* ── Paso 1: Datos personales ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5" noValidate>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">
                Paso 1 — Datos personales
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Nombre
                  </label>
                  <input type="text" name="firstName" value={form.firstName}
                    onChange={handleChange} placeholder="Juan" required
                    autoComplete="given-name" className="input-dark" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Apellido
                  </label>
                  <input type="text" name="lastName" value={form.lastName}
                    onChange={handleChange} placeholder="Pérez" required
                    autoComplete="family-name" className="input-dark" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  Teléfono <span className="text-gray-700 normal-case">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                   text-gray-600 text-[18px] pointer-events-none">phone</span>
                  <input type="tel" name="phone" value={form.phone}
                    onChange={handleChange} placeholder="+54 11 1234-5678"
                    autoComplete="tel" className="input-dark pl-10" />
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-3.5 mt-2">
                Continuar
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>
          )}

          {/* ── Paso 2: Credenciales ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="flex items-center gap-3 mb-4">
                <button type="button" onClick={() => setStep(1)}
                  className="text-gray-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Paso 2 — Credenciales
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                   text-gray-600 text-[18px] pointer-events-none">mail</span>
                  <input type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="tu@email.com" required
                    autoComplete="email" className="input-dark pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                   text-gray-600 text-[18px] pointer-events-none">lock</span>
                  <input type={showPass ? "text" : "password"} name="password"
                    value={form.password} onChange={handleChange}
                    placeholder="Mín. 8 caracteres con letras y números"
                    required autoComplete="new-password" className="input-dark pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-gray-600 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[18px]">
                      {showPass ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                   text-gray-600 text-[18px] pointer-events-none">lock_check</span>
                  <input type={showPass ? "text" : "password"} name="confirmPassword"
                    value={form.confirmPassword} onChange={handleChange}
                    placeholder="Repetí tu contraseña" required
                    autoComplete="new-password" className="input-dark pl-10" />
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">close</span>
                    No coinciden
                  </p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="text-primary text-xs mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check</span>
                    Coinciden
                  </p>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Crear cuenta
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider + link login */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-gray-700 font-bold uppercase tracking-wider">o</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <p className="text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </motion.div>

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
