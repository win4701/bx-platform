from fastapi import APIRouter
from services.wallet_service import get_wallet

router = APIRouter(prefix="/finance")

@router.get("/wallet")
def wallet(user_id:int):
    return get_wallet(user_id)

@router.get("/deposit/{asset}")
def deposit(asset:str):
    return {"address":f"{asset}_ADDRESS"}

@router.post("/withdraw")
def withdraw(data:dict):
    return {"status":"ok"}

@router.post("/transfer")
def transfer(data:dict):
    return {"status":"ok"}
