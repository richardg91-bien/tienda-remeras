import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [userMenu, setUserMenu]   = useState(false);
  const userMenuRef               = useRef(null);
  const { totalItems, toggleCart } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Precarga el bundle del Studio al hacer hover (descarga en background)
  const prefetchStudio = () => { import("../pages/Disenar.jsx"); };

  // Detecta scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Cierra el menú de usuario al hacer click fuera
  useEffect(() => {
    const fn = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenu(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Cierra el menú al navegar
  useEffect(() => { setUserMenu(false); }, [location.pathname]); // eslint-disable-line react-hooks/set-state-in-effect

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  // Oculta el Navbar en páginas de login/register
  const hideNavbar = ["/login", "/register"].includes(location.pathname);
  if (hideNavbar) return null;

  return (
    <>
      {/* ── Top header ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6
                    transition-all duration-300 ${
                      scrolled
                        ? "bg-background/80 backdrop-blur-2xl border-b border-white/10"
                        : "bg-transparent"
                    }`}
      >
        {/* Menú / ícono izquierda */}
        <Link to="/" className="text-primary" aria-label="Inicio">
          <span className="material-symbols-outlined text-[26px]">menu</span>
        </Link>

        {/* Brand centrado */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 text-2xl font-black tracking-tighter
                     text-primary italic hover:opacity-80 transition-opacity select-none"
        >
          NEON-STITCH
        </Link>

        {/* Link Studio — solo desktop, junto al brand */}
        <Link
          to="/disenar"
          onMouseEnter={prefetchStudio}
          onFocus={prefetchStudio}
          className={`hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2
                      ml-48 text-xs font-black uppercase tracking-wider transition-colors
                      px-3 py-1.5 rounded-full ${
                        location.pathname === "/disenar"
                          ? "text-background bg-primary neon-glow-sm"
                          : "text-gray-500 hover:text-primary glass-panel border border-white/10"
                      }`}
        >
          <span className="material-symbols-outlined text-[14px]">design_services</span>
          Studio
        </Link>
        {/* Acciones derecha */}
        <div className="flex items-center gap-1">

          {/* Carrito */}
          <button
            onClick={toggleCart}
            aria-label={`Carrito, ${totalItems} productos`}
            className="relative text-primary hover:opacity-80 transition-opacity p-2"
          >
            <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-0.5 right-0.5 w-[18px] h-[18px] bg-primary text-background
                           text-[9px] font-black rounded-full flex items-center justify-center"
              >
                {totalItems > 9 ? "9+" : totalItems}
              </motion.span>
            )}
          </button>

          {/* Usuario autenticado */}
          {isAuthenticated ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                aria-label="Menú de usuario"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5
                           transition-colors duration-200"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.first_name}
                    className="w-7 h-7 rounded-lg object-cover border border-primary/30" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30
                                  flex items-center justify-center">
                    <span className="text-[11px] font-black text-primary">
                      {user?.first_name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden md:block text-xs font-bold text-white max-w-[80px] truncate">
                  {user?.first_name}
                </span>
                <span className="material-symbols-outlined text-gray-500 text-[16px]">
                  {userMenu ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Dropdown menú */}
              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 glass-panel rounded-2xl
                               overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                  >
                    {/* Header del menú */}
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="text-xs font-black text-white truncate">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{user?.email}</p>
                    </div>

                    {/* Links */}
                    <div className="py-2">
                      <Link
                        to="/perfil"
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold
                                   text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                        Mi perfil
                      </Link>
                      <Link
                        to="/perfil"
                        onClick={() => setTimeout(() => {}, 0)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold
                                   text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-secondary">shopping_bag</span>
                        Mis órdenes
                      </Link>
                      <Link
                        to="/galeria"
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold
                                   text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-tertiary">photo_library</span>
                        Galería
                      </Link>
                      <Link
                        to="/catalogo"
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold
                                   text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-tertiary">storefront</span>
                        Catálogo
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-white/8 py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold
                                   text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        Cerrar sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* No autenticado — botón login */
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1.5 text-xs font-black uppercase
                         tracking-wider text-gray-400 hover:text-white transition-colors px-3 py-2
                         rounded-xl hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Ingresar
            </Link>
          )}
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16" />

      {/* ── Bottom nav mobile ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-surface/80 backdrop-blur-2xl
                   border-t border-white/10 flex justify-around items-center px-4 md:hidden"
        role="navigation"
      >
        <BottomNavItem to="/"          icon="storefront"        label="Tienda"   active={location.pathname === "/"} />
        <BottomNavItem to="/catalogo"  icon="auto_awesome"      label="Catálogo" active={location.pathname === "/catalogo"} />
        <BottomNavItem to="/galeria"   icon="photo_library"     label="Galería"  active={location.pathname === "/galeria"} />
        <BottomNavItem to="/disenar" icon="design_services" label="Studio" active={location.pathname === "/disenar"} onMouseEnter={prefetchStudio} />

        {/* Carrito — botón especial */}
        <button
          onClick={toggleCart}
          className="flex flex-col items-center text-gray-500 hover:text-primary transition-colors relative"
        >
          <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
          <span className="text-[10px] uppercase font-black mt-0.5 tracking-wider">Carrito</span>
          {totalItems > 0 && (
            <span className="absolute -top-1 left-1/2 translate-x-1 w-4 h-4 bg-primary text-background
                             text-[9px] font-black rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>

        {/* Perfil / Login */}
        {isAuthenticated ? (
          <BottomNavItem to="/perfil" icon="person" label="Perfil" active={location.pathname === "/perfil"} />
        ) : (
          <BottomNavItem to="/login"  icon="login"  label="Ingresar" active={location.pathname === "/login"} />
        )}
      </nav>

      {/* Spacer bottom nav mobile */}
      <div className="h-20 md:hidden" />
    </>
  );
}

function BottomNavItem({ to, icon, label, active, onMouseEnter }) {
  return (
    <Link
      to={to}
      onMouseEnter={onMouseEnter}
      onTouchStart={onMouseEnter}
      className={`flex flex-col items-center transition-colors duration-200 ${
        active ? "text-primary" : "text-gray-500 hover:text-primary"
      }`}
    >
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
      <span className="text-[10px] uppercase font-black mt-0.5 tracking-wider">{label}</span>
      {active && (
        <motion.div
          layoutId="bottom-nav-dot"
          className="w-1 h-1 rounded-full bg-primary mt-0.5"
        />
      )}
    </Link>
  );
}
