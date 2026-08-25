import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import Navbar          from "./components/Navbar";
import Cart            from "./components/Cart";
import AIAssistant     from "./components/AIAssistant";
import ProtectedRoute  from "./components/ProtectedRoute";
import Home            from "./pages/Home";
import Catalogo        from "./pages/Catalogo";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import Perfil          from "./pages/Perfil";

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
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protegidas — redirigen a /login si no hay sesión */}
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
