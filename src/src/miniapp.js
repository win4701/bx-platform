import express from "express";
import cors from "cors";
import crypto from "crypto";

import { getWallet } from "./db.js";
import { getBalance, claimBX, withdrawBX } from "./ton.js";
import { canWithdraw } from "./antifraud.js";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Verify Telegram WebApp initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
function verifyTelegramInitData(initData) {
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.BOT_TOKEN)
    .digest();

  const checkString = initData
    .split("&")
    .filter(p => !p.startsWith("hash="))
    .sort()
    .join("\n");

  const hash = new URLSearchParams(initData).get("hash");

  const calculated = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex");

  return calculated === hash;
}

/**
 * Middleware: Telegram auth
 */
function telegramAuth(req, res, next) {
  const initData = req.headers["x-telegram-init-data"];
  if (!initData) {
    return res.status(401).json({ error: "Missing initData" });
  }
  if (!verifyTelegramInitData(initData)) {
    return res.status(403).json({ error: "Invalid Telegram signature" });
  }
  const user = JSON.parse(
    new URLSearchParams(initData).get("user")
  );
  req.telegramUser = user;
  next();
}

/**
 * GET /api/me
 */
app.get("/api/me", telegramAuth, async (req, res) => {
  const tid = req.telegramUser.id;
  const wallet = await getWallet(tid);
  res.json({
    telegram_id: tid,
    username: req.telegramUser.username || null,
    wallet
  });
});

/**
 * GET /api/balance
 */
app.get("/api/balance", telegramAuth, async (req, res) => {
  const tid = req.telegramUser.id;
  const wallet = await getWallet(tid);
  if (!wallet) {
    return res.status(400).json({ error: "Wallet not connected" });
  }
  const balance = await getBalance(wallet);
  res.json({ balance });
});

/**
 * POST /api/claim
 */
app.post("/api/claim", telegramAuth, async (req, res) => {
  try {
    const tid = req.telegramUser.id;
    const wallet = await getWallet(tid);
    if (!wallet) throw new Error("Wallet not connected");
    await claimBX(tid, wallet);
    res.json({ status: "ok", message: "Claim successful" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/withdraw
 * body: { amount: number }
 */
app.post("/api/withdraw", telegramAuth, async (req, res) => {
  try {
    const tid = req.telegramUser.id;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const wallet = await getWallet(tid);
    if (!wallet) throw new Error("Wallet not connected");

    const ok = await canWithdraw(tid, amount);
    if (!ok) throw new Error("Daily limit reached");

    await withdrawBX(tid, wallet, amount);
    res.json({ status: "ok", message: "Withdrawal sent" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Start server
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mini App API running on port ${PORT}`);
});
