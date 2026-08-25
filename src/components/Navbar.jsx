import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { totalItems, toggleCart } = useCart();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── Top header (desktop + mobile) ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6
                    transition-all duration-300 ${
                      scrolled
                        ? "bg-background/80 backdrop-blur-2xl border-b border-white/10"
                        : "bg-transparent"
                    }`}
      >
        {/* Menú / logo izquierda */}
        <Link
          to="/"
          className="text-primary"
          aria-label="Inicio"
        >
          <span className="material-symbols-outlined text-[26px]">menu</span>
        </Link>

        {/* Brand centrado */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 text-2xl font-black tracking-tighter text-primary italic
                     hover:opacity-80 transition-opacity duration-200 select-none"
        >
          NEON-STITCH
        </Link>

        {/* Carrito derecha */}
        <button
          onClick={toggleCart}
          aria-label={`Carrito, ${totalItems} productos`}
          className="relative text-primary hover:opacity-80 transition-opacity duration-200"
        >
          <span className="material-symbols-outlined text-[26px]">shopping_bag</span>

          {totalItems > 0 && (
            <motion.span
              key={totalItems}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1 -right-1 w-[18px] h-[18px]
                         bg-primary text-background text-[9px] font-black rounded-full
                         flex items-center justify-center leading-none"
            >
              {totalItems > 9 ? "9+" : totalItems}
            </motion.span>
          )}
        </button>
      </header>

      {/* Spacer para el header fijo */}
      <div className="h-16" />

      {/* ── Bottom nav (mobile-first, igual al diseño NEON-STITCH) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 h-20
                   bg-surface/80 backdrop-blur-2xl border-t border-white/10
                   flex justify-around items-center px-6 md:hidden"
        role="navigation"
        aria-label="Navegación principal"
      >
        <BottomNavItem
          to="/"
          icon="storefront"
          label="Tienda"
          active={location.pathname === "/"}
        />
        <BottomNavItem
          to="/catalogo"
          icon="auto_awesome"
          label="IA Visual"
          active={location.pathname === "/catalogo"}
        />
        <button
          onClick={toggleCart}
          className="flex flex-col items-center text-gray-500 hover:text-primary transition-colors duration-200"
          aria-label="Carrito"
        >
          <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
          <span className="text-[10px] uppercase font-black mt-1 tracking-wider">Carrito</span>
          {totalItems > 0 && (
            <span className="absolute top-2 right-[calc(25%-6px)] w-4 h-4
                             bg-primary text-background text-[9px] font-black rounded-full
                             flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
        <BottomNavItem
          to="/#info"
          icon="person"
          label="Perfil"
          active={false}
        />
      </nav>

      {/* Spacer bottom nav en mobile */}
      <div className="h-20 md:hidden" />
    </>
  );
}

function BottomNavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center transition-colors duration-200 ${
        active ? "text-primary" : "text-gray-500 hover:text-primary"
      }`}
    >
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
      <span className="text-[10px] uppercase font-black mt-1 tracking-wider">{label}</span>
      {active && (
        <motion.div
          layoutId="bottom-nav-dot"
          className="w-1 h-1 rounded-full bg-primary mt-0.5 neon-glow-sm"
        />
      )}
    </Link>
  );
}
