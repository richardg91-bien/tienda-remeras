import { useState } from "react";
import Products from "../components/Products";

export default function Catalogo() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const removeItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const total = cart.reduce((acc, item) => acc + item.price, 0);

  const checkoutWhatsApp = () => {
    const phone = "5491122334455";

    const message =
      "Hola! Quiero comprar:%0A%0A" +
      cart.map((p) => `• ${p.name} - $${p.price}`).join("%0A") +
      `%0A%0ATotal: $${total}`;

    window.open(
      `https://wa.me/${phone}?text=${message}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-40">

      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-900 px-6 py-4">
        <h1 className="text-3xl font-extrabold tracking-widest uppercase">
          Catálogo <span className="text-white">Urban Drop</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Streetwear · diseño minimalista · calidad premium
        </p>
      </header>

      {/* PRODUCTS */}
      <main className="px-6 py-6">
        <Products addToCart={addToCart} />
      </main>

      {/* CART */}
      <div className="fixed bottom-0 left-0 w-full bg-zinc-950/95 backdrop-blur border-t border-zinc-800">

        <div className="px-4 py-3 flex justify-between items-center">

          <div>
            <p className="font-bold">
              🧺 {cart.length} items
            </p>
            <p className="text-white font-semibold">
              Total: ${total}
            </p>
          </div>

          <button
            onClick={checkoutWhatsApp}
            className="bg-white hover:bg-zinc-200 transition text-black px-5 py-2 rounded-full font-bold"
          >
            Comprar
          </button>

        </div>

        {/* LISTA DEL CARRITO */}
        {cart.length > 0 && (
          <div className="max-h-32 overflow-y-auto px-4 pb-3">
            {cart.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center text-sm border-t border-zinc-800 py-2"
              >
                <span className="text-zinc-300">
                  {item.name} - ${item.price}
                </span>

                <button
                  onClick={() => removeItem(index)}
                  className="text-zinc-400 hover:text-white"
                >
                  eliminar
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}