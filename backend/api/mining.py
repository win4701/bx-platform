from fastapi import APIRouter

router = APIRouter(prefix="/mining")

@router.get("/plans")
def plans():

    return {
     "BX":[
      {"id":"starter","roi":2.5,"days":10,"min":5,"max":60},
      {"id":"basic","roi":5,"days":21,"min":50,"max":250},
      {"id":"silver","roi":6,"days":25,"min":120,"max":500},
      {"id":"golden","roi":8,"days":30,"min":200,"max":800},
      {"id":"diamond","roi":10,"days":40,"min":500,"max":1500},
      {"id":"pro","roi":12,"days":45,"min":1000,"max":3000}
     ]
    }

@router.post("/subscribe")
def subscribe(data:dict):
    return {"status":"started"}

@router.get("/status")
def status():
    return []

@router.post("/claim")
def claim(data:dict):
    return {"status":"claimed"}
