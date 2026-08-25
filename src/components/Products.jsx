import { motion } from "framer-motion";
import ProductCard from "./ProductCard";

export default function Products({ products, title = "Nuestras Remeras" }) {
  if (!products || products.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-4">😶</p>
        <p className="text-zinc-400 text-lg">No hay productos en esta categoría.</p>
      </div>
    );
  }

  return (
    <section className="py-6">
      {title && (
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="section-title mb-8"
        >
          {title}
        </motion.h2>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
