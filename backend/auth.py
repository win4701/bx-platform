import os
import hmac
import hashlib
import urllib.parse
import json
from fastapi import HTTPException

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN not set")

def verify_telegram_init_data(init_data: str) -> dict:
    """
    Verifies Telegram Mini App initData
    Returns parsed data if valid
    """
    data = dict(urllib.parse.parse_qsl(init_data, strict_parsing=True))
    received_hash = data.pop("hash", None)

    if not received_hash:
        raise HTTPException(401, "NO_HASH")

    secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))

    calculated_hash = hmac.new(
        secret,
        check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(401, "INVALID_INIT_DATA")

    return data

def get_telegram_user(init_data: str) -> dict:
    data = verify_telegram_init_data(init_data)

    try:
        user = json.loads(data["user"])
    except Exception:
        raise HTTPException(400, "INVALID_USER_DATA")

    return {
        "uid": user["id"],
        "username": user.get("username"),
        "first_name": user.get("first_name")
  }
