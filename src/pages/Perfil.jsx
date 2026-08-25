import { useState, useEffect } from "react";
import { Link, useNavigate }  from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth }  from "../context/AuthContext";
import { formatPrice } from "../data/products";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const STATUS_LABEL = {
  pending:    { label: "Pendiente",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  paid:       { label: "Pagado",      color: "text-primary bg-primary/10 border-primary/30" },
  processing: { label: "Procesando",  color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  shipped:    { label: "Enviado",     color: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
  delivered:  { label: "Entregado",   color: "text-green-400 bg-green-400/10 border-green-400/30" },
  cancelled:  { label: "Cancelado",   color: "text-red-400 bg-red-400/10 border-red-400/30" },
  refunded:   { label: "Reembolsado", color: "text-gray-400 bg-gray-400/10 border-gray-400/30" },
};

// ── Sección editable de perfil ────────────────────────────
function EditProfileForm({ user, authFetch, updateUser, onClose }) {
  const [form, setForm]   = useState({
    firstName: user.first_name || "",
    lastName:  user.last_name  || "",
    phone:     user.phone      || "",
    bio:       user.bio        || "",
    address: {
      street:   user.address?.street   || "",
      city:     user.address?.city     || "",
      province: user.address?.province || "",
      zip:      user.address?.zip      || "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setForm((p) => ({ ...p, address: { ...p.address, [field]: value } }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess(false);
    try {
      const res  = await authFetch("/api/users/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error actualizando perfil.");
      updateUser({
        first_name: data.user.first_name,
        last_name:  data.user.last_name,
        phone:      data.user.phone,
        bio:        data.user.bio,
        address:    data.user.address,
      });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-400 text-sm flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">error</span> {error}
        </p>
      )}
      {success && (
        <p className="text-primary text-sm flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">check_circle</span> ¡Perfil actualizado!
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Nombre</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} className="input-dark" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Apellido</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} className="input-dark" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Teléfono</label>
        <input name="phone" value={form.phone} onChange={handleChange} className="input-dark" placeholder="+54 11..." />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Bio</label>
        <textarea name="bio" value={form.bio} onChange={handleChange} rows={2}
          className="input-dark resize-none" placeholder="Contanos algo sobre vos..." maxLength={200} />
      </div>

      <div className="border-t border-white/8 pt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Dirección de envío</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["address.street", "Calle"],
            ["address.city", "Ciudad"],
            ["address.province", "Provincia"],
            ["address.zip", "Código postal"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="block text-[10px] text-gray-600 mb-1">{label}</label>
              <input name={name}
                value={name.includes(".") ? form.address[name.split(".")[1]] : form[name]}
                onChange={handleChange} className="input-dark py-2 text-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 btn-outline py-2.5 text-xs">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 btn-primary py-2.5 text-xs disabled:opacity-50">
          {loading ? <span className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" /> : null}
          Guardar
        </button>
      </div>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────
export default function Perfil() {
  const { user, logout, updateUser, authFetch } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState("perfil");
  const [editMode, setEditMode]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res  = await authFetch("/api/users/orders");
        const data = await res.json();
        if (res.ok) setOrders(data.orders);
      } catch { /* silencioso */ }
      finally { setLoadingOrders(false); }
    };
    fetchOrders();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const tabs = [
    { id: "perfil",  label: "Mi perfil",  icon: "person" },
    { id: "ordenes", label: "Mis órdenes", icon: "shopping_bag" },
  ];

  return (
    <div className="bg-background min-h-screen text-white">

      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/6">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-48 rounded-full bg-secondary/5 blur-[80px]" />
          <div className="absolute inset-0 bg-grid opacity-50" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-8">
          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="flex items-center gap-5"
          >
            {/* Avatar */}
            <motion.div variants={fadeUp} className="relative flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.first_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-primary/20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20
                                flex items-center justify-center">
                  <span className="text-2xl font-black text-primary">
                    {user?.first_name?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500
                              border-2 border-background" />
            </motion.div>

            {/* Info */}
            <motion.div variants={fadeUp} className="flex-1 min-w-0">
              <p className="section-label mb-1">Mi cuenta</p>
              <h1 className="text-2xl font-black truncate">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-gray-500 text-sm truncate">{user?.email}</p>
            </motion.div>

            {/* Logout */}
            <motion.button
              variants={fadeUp}
              onClick={handleLogout}
              className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-500
                         hover:text-red-400 transition-colors font-bold uppercase tracking-wider
                         px-3 py-2 rounded-xl hover:bg-red-500/10"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:block">Salir</span>
            </motion.button>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-1 mt-8"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setEditMode(false); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black
                            uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-background neon-glow-sm"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── Tab: Perfil ── */}
          {activeTab === "perfil" && (
            <motion.div key="perfil"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            >
              <div className="glass-panel rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-black text-xl">Datos personales</h2>
                  {!editMode && (
                    <button onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Editar
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {editMode ? (
                    <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <EditProfileForm
                        user={user} authFetch={authFetch}
                        updateUser={updateUser} onClose={() => setEditMode(false)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="grid sm:grid-cols-2 gap-5"
                    >
                      {[
                        ["person",    "Nombre",    `${user?.first_name} ${user?.last_name}`],
                        ["mail",      "Email",     user?.email],
                        ["phone",     "Teléfono",  user?.phone || "No registrado"],
                        ["location_on","Ciudad",   user?.address?.city || "No registrada"],
                        ["home",      "Dirección", user?.address?.street || "No registrada"],
                        ["map",       "Provincia", user?.address?.province || "No registrada"],
                      ].map(([icon, label, value]) => (
                        <div key={label} className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">{icon}</span>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{label}</p>
                            <p className="text-white text-sm font-medium mt-0.5">{value}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Links rápidos */}
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <Link to="/catalogo"
                  className="glass-panel rounded-2xl p-5 hover:border-primary/30 transition-all
                             duration-200 hover:-translate-y-0.5 group flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary text-[28px]">storefront</span>
                  <div>
                    <p className="font-black">Ver catálogo</p>
                    <p className="text-gray-500 text-xs">Explorá la colección</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-700 group-hover:text-primary
                                   transition-colors ml-auto text-[18px]">arrow_forward</span>
                </Link>
                <button onClick={() => setActiveTab("ordenes")}
                  className="glass-panel rounded-2xl p-5 hover:border-primary/30 transition-all
                             duration-200 hover:-translate-y-0.5 group flex items-center gap-4 text-left w-full">
                  <span className="material-symbols-outlined text-secondary text-[28px]">shopping_bag</span>
                  <div>
                    <p className="font-black">Mis órdenes</p>
                    <p className="text-gray-500 text-xs">{orders.length} orden{orders.length !== 1 ? "es" : ""}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-700 group-hover:text-primary
                                   transition-colors ml-auto text-[18px]">arrow_forward</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Tab: Órdenes ── */}
          {activeTab === "ordenes" && (
            <motion.div key="ordenes"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="font-black text-xl mb-6">Mis órdenes</h2>

              {loadingOrders ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="glass-panel rounded-3xl p-16 text-center">
                  <span className="material-symbols-outlined text-[64px] text-gray-800 mb-4 block">
                    shopping_bag
                  </span>
                  <p className="font-black text-lg text-gray-500">No tenés órdenes todavía</p>
                  <Link to="/catalogo" className="btn-primary text-xs px-6 py-2.5 mt-6 inline-flex">
                    Ir a comprar
                  </Link>
                </div>
              ) : (
                orders.map((order) => {
                  const st = STATUS_LABEL[order.status] || { label: order.status, color: "text-gray-400" };
                  return (
                    <div key={order.id} className="glass-panel rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">
                            Orden #{order.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(order.created_at).toLocaleDateString("es-AR", {
                              day: "2-digit", month: "long", year: "numeric"
                            })}
                          </p>
                        </div>
                        <span className={`badge border ${st.color}`}>{st.label}</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 mb-4">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            {item.image && (
                              <img src={item.image} alt={item.name}
                                className="w-10 h-12 object-cover rounded-lg flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold line-clamp-1">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {item.selected_size && `Talle: ${item.selected_size} · `}
                                x{item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-black text-primary flex-shrink-0">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-white/8 pt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="font-black text-lg text-primary">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
