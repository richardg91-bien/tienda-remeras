import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // opciones recomendadas para producción
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);

    // Eventos de conexión
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB desconectado");
    });
    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconectado");
    });

  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
    process.exit(1); // Cierra el proceso si no puede conectar
  }
};

export default connectDB;
