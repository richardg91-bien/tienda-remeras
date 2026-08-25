import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-b from-black via-zinc-900 to-black">

        <p className="text-green-400 tracking-[0.3em] text-sm mb-4">
          NUEVA COLECCIÓN 2026
        </p>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
          REMERAS<br />
          <span className="text-green-400">URBAN STYLE</span>
        </h1>

        <p className="text-zinc-400 mt-6 max-w-md">
          Diseños minimalistas, oversize y streetwear premium para destacar en cualquier lugar.
        </p>

        <div className="flex gap-4 mt-10">
          <Link
            to="/catalogo"
            className="bg-green-500 text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition"
          >
            Ver catálogo
          </Link>

          <a
            href="#info"
            className="border border-zinc-600 px-6 py-3 rounded-full hover:border-green-400 transition"
          >
            Más info
          </a>
        </div>
      </section>

      {/* INFO SECTION */}
      <section id="info" className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Calidad premium
        </h2>

        <p className="text-zinc-400 max-w-xl mx-auto">
          Algodón 100%, estampados resistentes y diseño pensado para uso diario o moda urbana.
        </p>
      </section>

    </div>
  );
}