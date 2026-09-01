import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { CartProvider }    from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

// Carrito y asistente IA solo para usuarios autenticados
function AuthenticatedGlobals() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <>
      <Cart />
      <AIAssistant />
    </>
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
            {/* Públicas — solo Home, Login y Register sin autenticación */}
            <Route path="/"         element={<Home />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protegidas — requieren registro */}
            <Route path="/catalogo"    element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
            <Route path="/galeria"     element={<ProtectedRoute><Galeria /></ProtectedRoute>} />
            <Route path="/producto/:id" element={<ProtectedRoute><Producto /></ProtectedRoute>} />
            <Route path="/perfil"      element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

            {/* Design Studio — protegido + lazy */}
            <Route
              path="/disenar"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<DesignerFallback />}>
                    <Disenar />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>

          {/* Globales — solo visibles si está autenticado */}
          <AuthenticatedGlobals />

        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
