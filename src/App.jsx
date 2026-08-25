import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import Navbar       from "./components/Navbar";
import Cart         from "./components/Cart";
import AIAssistant  from "./components/AIAssistant";
import Home         from "./pages/Home";
import Catalogo     from "./pages/Catalogo";

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        {/* Navbar fijo (top header + bottom nav mobile) */}
        <Navbar />

        {/* Rutas principales */}
        <Routes>
          <Route path="/"         element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          {/* Fallback: redirige a home */}
          <Route path="*"         element={<Home />} />
        </Routes>

        {/* Drawer del carrito (global) */}
        <Cart />

        {/* Asistente IA flotante (global) */}
        <AIAssistant />
      </BrowserRouter>
    </CartProvider>
  );
}
