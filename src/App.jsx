import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas
import Home from "./pages/Home";
import Catalogo from "./pages/Catalogo";

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-black text-white min-h-screen">

        <Routes>

          {/* 🏠 Landing principal (marca) */}
          <Route path="/" element={<Home />} />

          {/* 🛍️ Catálogo de productos */}
          <Route path="/catalogo" element={<Catalogo />} />

        </Routes>

      </div>
    </BrowserRouter>
  );
}