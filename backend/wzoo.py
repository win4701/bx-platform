# API URLs
BINANCE_PAY_API_URL = "https://api.binancepay.com"
WALLETCONNECT_API_URL = "https://api.walletconnect.org"
STON_FI_API_BASE = "https://api.ston.fi"
API_BASE_URL = "http://localhost:8000"

# Dummy Data for Casino and Market
recent_casino_data = [
    {"game": "Roulette", "player": "User123", "bet": 50, "outcome": "Win", "reward": 100},
    {"game": "Blackjack", "player": "User456", "bet": 30, "outcome": "Lose", "reward": 0},
    {"game": "Poker", "player": "User789", "bet": 100, "outcome": "Win", "reward": 200},
]

recent_market_data = [
    {"pair": "BX/USDT", "side": "buy", "amount": 10, "price": 100},
    {"pair": "BX/USDT", "side": "sell", "amount": 5, "price": 105},
    {"pair": "BX/ETH", "side": "buy", "amount": 2, "price": 2500},
]

# ================== Models ==================

# template API 
class MiningOrder(BaseModel):
    asset: str
    plan: str
    investment: float
    user_id: int

# ================== Recent Casino ==================

@app.get("/casino/recent")
def get_recent_casino():
    """ casino recent"""
    return {"recent_casino": recent_casino_data}

# ================== Recent Market ==================

@app.get("/market/recent")
def get_recent_market():
    """ market recent"""
    return {"recent_market": recent_market_data}

# ================== Airdrop ==================

@app.get("/bxing/airdrop/status")
def airdrop_status(uid: int):
    """ sync Airdrop"""
    return {"claimed": False, "reward": 50}

@app.post("/bxing/airdrop/claim")
def claim_airdrop(uid: int):
    """ Calim Airdrop """
    return {"status": "ok", "reward": 50}

# ================== Referral ==================

@app.get("/bxing/referral/link")
def get_referral_link(uid: int):
    """ create link ref """
    return {"link": f"https://bloxio.online/referral/{uid}"}

@app.get("/bxing/referral/leaderboard")
def get_referral_leaderboard():
    """ sync board """
    return [
        {"id": 1, "referrals": 50},
        {"id": 2, "referrals": 30},
        {"id": 3, "referrals": 10},
    ]

# ================== Mining ==================

@app.post("/bxing/mining/start")
def start_mining(order: MiningOrder):
    """ start mining """
    if order.investment < 10:
        raise HTTPException(status_code=400, detail="Minimum investment is 10.")
    
    return {"status": "started", "estimated_return": order.investment * 1.2}  

@app.get("/bxing/mining/active")
def get_active_mining(uid: int):
    """ user mining """
    return [
        {"asset": "BX", "plan": "Starter", "roi": 2.5},
        {"asset": "SOL", "plan": "Infinity", "roi": 14}
    ]

# ================== WalletConnect ==================

@app.post("/walletconnect/connect")
def connect_wallet(user_id: int, wallet_address: str):
    """ WalletConnect """
    return {"status": "success", "message": f"Wallet {wallet_address} connected successfully."}

# ================== Binance Pay ==================

@app.post("/binancepay/pay")
def binance_pay(user_id: int, amount: float, recipient_address: str):
    """ Binance Pay """
    transaction_data = {
        "user_id": user_id,
        "amount": amount,
        "recipient_address": recipient_address
    }
    
    return {"status": "success", "message": f"Successfully paid {amount} to {recipient_address} via Binance Pay."}

# ================== Ston.fi ==================
class BuyBXOrder(BaseModel):
    ton_amount: float  

@app.get("/stonfi/bx_price")
def get_bx_price():
    """ Get BX price for TON/USDT """
    return {"price": 8}  # 

@app.post("/stonfi/buy")
def buy_bx(order: BuyBXOrder):
    """ Buy BX using TON/USDT """
    if order.ton_amount <= 0:
        raise HTTPException(status_code=400, detail="The TON amount must be greater than zero.")
    
    price_data = get_bx_price()  
    price = price_data["price"]
    bx_amount = order.ton_amount / price
    
    response = {"status": "success", "message": f"Bought {bx_amount} BX for {order.ton_amount} TON."}
    
    return response
