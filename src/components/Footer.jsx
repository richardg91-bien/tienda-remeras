import { Link } from "react-router-dom";
import BrandMark from "./BrandMark.jsx";

export default function Footer() {
  return (
    <footer className="brand-footer px-5 pb-28 pt-12 sm:px-8 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500">
            <BrandMark />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
            Tu creatividad. Sin límites.
          </p>
        </div>
        <nav aria-label="Navegación del pie de página" className="flex flex-col items-start gap-3 text-sm font-semibold text-slate-600">
          <Link className="transition-colors hover:text-violet-700" to="/">Inicio</Link>
          <Link className="transition-colors hover:text-violet-700" to="/catalogo">Catálogo</Link>
          <Link className="transition-colors hover:text-violet-700" to="/galeria">Galería</Link>
          <Link className="transition-colors hover:text-violet-700" to="/disenar">Diseñador</Link>
        </nav>
        <div id="footer-about">
          <p className="section-label mb-3">Creado por</p>
          <p className="creator-signature text-2xl font-extrabold tracking-tight">RichardG91</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Una plataforma independiente para imaginar y personalizar prendas.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 ANATHEL Design. Todos los derechos reservados.</span>
        <Link to="/#about" className="font-semibold transition-colors hover:text-violet-700">
          Sobre nosotros
        </Link>
      </div>
    </footer>
  );
}
