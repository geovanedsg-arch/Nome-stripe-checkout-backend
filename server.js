import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

//sk_test_51SDxPy601dGxOPbreccC4JOdTtKXnRgDPuUiFHQNueNDM1Bhn1BAEjUgKrT5L6R4xCPawkBRMo0XnT1W9zNVsXEN0091Apkd5m
const stripe = new Stripe
