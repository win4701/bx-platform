import hmac, hashlib, urllib.parse
from fastapi import HTTPException

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

def verify_telegram_init_data(init_data: str):
    data = dict(urllib.parse.parse_qsl(init_data, strict_parsing=True))
    hash_ = data.pop("hash", None)
    if not hash_:
        raise HTTPException(401, "NO_HASH")

    secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
    check = "\n".join(f"{k}={v}" for k,v in sorted(data.items()))
    calc_hash = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()

    if calc_hash != hash_:
        raise HTTPException(401, "INVALID_INIT_DATA")

    return data
  @app.post("/auth/telegram")
def telegram_auth(init_data: str):
    data = verify_telegram_init_data(init_data)
    user = eval(data["user"])
    return {
        "uid": user["id"],
        "username": user.get("username")
    }
