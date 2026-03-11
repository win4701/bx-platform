from db.database import db

def get_wallet(user_id):

    rows = db.execute(
        "SELECT asset,balance FROM wallets WHERE user_id=?",
        (user_id,)
    )

    balances = {}

    for r in rows:
        balances[r["asset"]] = r["balance"]

    return balances
