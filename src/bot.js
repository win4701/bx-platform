import dotenv from "dotenv";
dotenv.config();

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import path from "path";

import { registerMessages } from "./bot/messages.js";
import { registerCallbacks } from "./bot/callbacks.js";

import buyRoutes from "./routes/buy.js";
import sellRoutes from "./routes/sell.js";
import miningRoutes from "./routes/mining.js";
import gameRoutes from "./routes/games.js";
import tournamentRoutes from "./routes/tournament.js";
import webhooks from "./routes/webhooks/index.js";

const app = express();
app.use(express.json());

app.use("/api/buy", buyRoutes);
app.use("/api/sell", sellRoutes);
app.use("/api/mining", miningRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/tournament", tournamentRoutes);
app.use("/webhook", webhooks);

app.use("/app", express.static("app"));
app.use("/", express.static("public"));

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
registerMessages(bot);
registerCallbacks(bot);

app.listen(process.env.PORT || 3000);
