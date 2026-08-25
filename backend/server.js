import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Preference } from "mercadopago";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 CONFIG CLIENTE
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN,
});

// 💳 crear pago
app.post("/create_preference", async (req, res) => {
  try {
    const cart = req.body.cart;

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: cart.map((item) => ({
          title: item.name,
          quantity: 1,
          unit_price: item.price,
        })),
        back_urls: {
          success: "http://localhost:5173",
          failure: "http://localhost:5173",
          pending: "http://localhost:5173",
        },
        auto_return: "approved",
      },
    });

    res.json({ init_point: result.init_point });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error creando pago" });
  }
});

app.listen(3000, () => {
  console.log("Backend MercadoPago listo 🚀");
});