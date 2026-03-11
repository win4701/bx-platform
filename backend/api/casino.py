from fastapi import APIRouter
import random

router = APIRouter(prefix="/casino")

@router.post("/play")
def play(data:dict):

    win = random.choice([True,False])

    if win:
        return {"win":True,"payout":2}

    return {"win":False}
