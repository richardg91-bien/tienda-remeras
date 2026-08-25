import { motion } from "framer-motion";
import heroImg from "../assets/hero.png";

export default function Hero() {
  return (
    <section className="h-screen flex flex-col md:flex-row items-center justify-center px-6 text-center md:text-left">

      <div className="flex-1">

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-extrabold"
        >
          Streetwear <span className="text-green-400">Premium</span>
        </motion.h1>

        <p className="mt-6 text-gray-400 max-w-xl">
          Remeras únicas, diseño moderno y calidad premium para destacar en cualquier lugar.
        </p>

        <button className="mt-6 bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-bold">
          Ver productos
        </button>

      </div>

      <motion.img
        src={heroImg}
        alt="remera"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="w-[300px] md:w-[450px] mt-10 md:mt-0"
      />
    </section>
  );
}