import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const stripe = new Stripe("sk_test_51SDxPy601dGxOPbreccC4JOdTtKXnRgDPuUiFHQNueNDM1Bhn1BAEjUgKrT5L6R4xCPawkBRMo0XnT1W9zNVsXEN0091Apkd5m");

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://elevase.com.br/vip",
      cancel_url: "https://elevase.com.br/assinatura",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Erro no webhook:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed":
        console.log("✅ Pagamento confirmado");
        break;

      case "invoice.payment_failed":
        console.log("⚠️ Pagamento falhou");
        break;

      case "charge.refunded":
        console.log("💸 Reembolso emitido");
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.status(200).send("Webhook recebido!");
  }
);

app.listen(10000, () => console.log("Servidor Stripe ativo na porta 10000"));
