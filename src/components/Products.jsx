const products = [
  {
    id: 1,
    name: "Remera Negra Oversize",
    price: 12000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
  },
  {
    id: 2,
    name: "Remera Blanca Minimal",
    price: 10000,
    image: "https://images.unsplash.com/photo-1520975916090-3105956dac38",
  },
  {
    id: 3,
    name: "Remera Street Art",
    price: 14000,
    image: "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb",
  },
  {
    id: 4,
    name: "Remera Premium Fit",
    price: 16000,
    image: "https://images.unsplash.com/photo-1520975682031-a2c8a0a2c3b3",
  },
];

export default function Products({ addToCart }) {
  return (
    <section className="px-6 py-20">
      
      {/* TITULO */}
      <h2 className="text-3xl font-bold text-center mb-10">
        Nuestras Remeras
      </h2>

      {/* GRID PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">

        {products.map((product) => (
          <div
            key={product.id}
            className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:scale-105 transition"
          >
            
            {/* IMAGEN */}
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-56 object-cover"
            />

            {/* INFO */}
            <div className="p-4">
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-green-400 font-semibold mt-1">
                ${product.price}
              </p>

              {/* BOTON */}
              <button
                onClick={() => addToCart(product)}
                className="mt-4 w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2 rounded-xl"
              >
                Agregar al carrito
              </button>
            </div>

          </div>
        ))}

      </div>
    </section>
  );
}