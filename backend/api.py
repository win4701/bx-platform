# ==========================================================
# BLOXIO API COMPATIBILITY LAYER
# Frontend ↔ Backend bridge
# ==========================================================

from fastapi import APIRouter, Depends
from auth import telegram_login
from finance import deposit_address, withdraw
from security import get_current_user

router = APIRouter(prefix="/api")

# =========================================
# AUTH
# =========================================

@router.post("/auth/telegram")
def api_telegram(data):
    return telegram_login(data)

# =========================================
# WALLET CONNECT
# =========================================

@router.post("/wallet/connect")
def wallet_connect(user=Depends(get_current_user)):
    return {"status": "connected"}

# =========================================
# DEPOSIT ADDRESS
# =========================================

@router.get("/deposit/address")
def deposit(asset: str, user=Depends(get_current_user)):
    return deposit_address(asset, user)

# =========================================
# WITHDRAW
# =========================================

@router.post("/withdraw")
def api_withdraw(req, user=Depends(get_current_user)):
    return withdraw(req, user)
