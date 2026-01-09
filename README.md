# BX Platform

BX Platform  **Telegram Mini App**    Market، Wallet، Casino، Mining، Airdrop  **TON / USDT**  Backend . 


---

## ✨ Features

- Telegram Mini App Authentication (Server-side)
- Wallet (TON / USDT)
- Market (Buy / Sell BX)
- Casino & Mining
- Airdrop system
- TON Auto Deposit (Background Worker)
- Binance / RedotPay integration
- Unified Audit Logs
- API Gateway
- Render-ready deployment

---

## 🧱 Project Structure
---

## 🔐 Security Design

- User identity is verified via Telegram `initData`
- No direct balance manipulation from frontend
- Real-money operations are isolated in admin services
- All financial actions are logged (audit trail)
- TON deposits are processed automatically via blockchain watcher

---

## 🗄️ Database

The project uses **SQLite** by default.

Initialize the database once:

```bash
cd backend/db
python init_db.py
