import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { CartProvider }    from "./context/CartContext";
import { AuthProvider }    from "./context/AuthContext";
import Navbar              from "./components/Navbar";
import Cart                from "./components/Cart";
import AIAssistant         from "./components/AIAssistant";
import ProtectedRoute      from "./components/ProtectedRoute";
import Home                from "./pages/Home";
import Catalogo            from "./pages/Catalogo";
import Login               from "./pages/Login";
import Register            from "./pages/Register";
import Perfil              from "./pages/Perfil";
import Galeria             from "./pages/Galeria";
import Producto            from "./pages/Producto";

// Lazy: carga el diseñador solo cuando el usuario navega a /disenar
// Evita que Three.js + Fabric.js inflen el bundle principal
const Disenar = lazy(() => import("./pages/Disenar.jsx"));

function DesignerFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">
          Cargando Design Studio...
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>

          {/* Navbar global — muestra avatar/sesión si está logueado */}
          <Navbar />

          <Routes>
            {/* Públicas */}
            <Route path="/"         element={<Home />} />
            <Route path="/catalogo"      element={<Catalogo />} />
            <Route path="/galeria"        element={<Galeria />} />
            <Route path="/producto/:id"   element={<Producto />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Design Studio — carga lazy para no inflar el bundle */}
            <Route
              path="/disenar"
              element={
                <Suspense fallback={<DesignerFallback />}>
                  <Disenar />
                </Suspense>
              }
            />

            {/* Protegidas */}
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>

          {/* Globales */}
          <Cart />
          <AIAssistant />

        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
