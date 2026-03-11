from fastapi import APIRouter
import random

router = APIRouter(prefix="/market")

price = 1.0

@router.get("/price")
def price_feed():

    global price

    price += random.uniform(-0.01,0.01)

    return {"price":round(price,4)}
