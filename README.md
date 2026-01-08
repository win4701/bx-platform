# BX Platform — Telegram Mini App (v1.0)

BX Platform is a **Telegram Mini App** that combines:
- BX Mining
- Buy / Sell BX
- Casino (fixed RTP)
- USDT Withdraw (Admin approval)
- Referral system
- Airdrop progress tracking

The project is designed to be:
- Lightweight
- Fast
- Scalable
- Production-ready

---

## ✨ Features (v1.0)

### ⛏️ Mining
- Live BX mining
- Tick-based anti-abuse logic
- Automatic daily limits

### 💱 Buy / Sell BX
- Fixed BX ↔ USDT price
- Sell with implicit fee (RTP logic)
- Full accounting logs

### 🎰 Casino
- Fixed RTP
- Logs ready for provably fair logic
- Simple and clean UI

### 💸 Withdraw USDT
- Manual admin approval
- Methods: Binance ID, RedotPay
- Status flow: Pending / Done / Rejected

### 🧲 Referral
- Automatic referral links
- Fixed BX reward
- Anti-duplicate protection

### 🎁 Airdrop
- Progress tracking only (no direct claim)
- Snapshot planned for later phases

### 📊 Leaderboard
- Top miners ranking
- Periodic refresh

---

## 🧠 Architecture

```text
Telegram Mini App
        |
        v
index.html + app.js (Vanilla JS)
        |
        v
FastAPI (main.py)
        |
        v
SQLite (db.sqlite)
