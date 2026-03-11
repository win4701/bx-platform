from fastapi import APIRouter

router = APIRouter(prefix="/airdrop")

@router.get("/status")
def status():
    return {
        "referrals":3,
        "reward":0.25,
        "claimed":1
    }

@router.post("/claim")
def claim():
    return {"status":"ok"}

@router.get("/referral")
def referral():
    return {"code":"BX123"}
