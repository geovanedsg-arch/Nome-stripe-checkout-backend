import express from "express";
import cors from "cors";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.raw({ type: "application/json" }));

const PRICE_ID_MENSAL = "price_1SHwAo601dGxOPbrAVr87QGM";
const PRICE_ID_SEMESTRAL = "price_1SHxgK601dGxOPbrP8zobDlI";

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { plano, email } = req.body;

    const priceId = plano === "semestral" ? PRICE_ID_SEMESTRAL : PRICE_ID_MENSAL;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: "https://elevase.com.br/vip",
      cancel_url: "https://elevase.com.br/assinatura",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    res.status(500).json({ error: "Erro ao criar sessão de checkout" });
  }
});

app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Erro no webhook:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_email;

        await supabase
          .from("assinaturas")
          .upsert({
            email,
            status: "ativo",
            plano: session.metadata?.plano || "mensal",
            data_inicio: new Date().toISOString(),
          });

        console.log("Assinatura confirmada:", email);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const email = invoice.customer_email;

        await supabase
          .from("assinaturas")
          .update({ status: "pagamento_falhou" })
          .eq("email", email);

        console.log("Pagamento falhou:", email);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const email = customer.email;

        await supabase
          .from("assinaturas")
          .update({ status: "cancelado" })
          .eq("email", email);

        console.log("Assinatura cancelada:", email);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const email = charge.billing_details.email;

        await supabase
          .from("assinaturas")
          .update({ status: "reembolsado" })
          .eq("email", email);

        console.log("Reembolso feito para:", email);
        break;
      }

      default:
        console.log(`Evento ignorado: ${event.type}`);
    }

    res.status(200).send();
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.status(500).send("Erro interno no servidor");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
