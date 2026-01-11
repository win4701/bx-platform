import os
from fastapi import Header, HTTPException, Depends

API_KEY = os.getenv("API_KEY", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

# =========================
# API KEY (PUBLIC)
# =========================
def api_guard(x_api_key: str = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "INVALID_API_KEY")

# =========================
# ADMIN ONLY
# =========================
def admin_guard(x_admin_token: str = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "ADMIN_ONLY")
