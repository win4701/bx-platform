# finance.py

def casino_debit(uid: int, amount: float, game: str):
    # خصم BX (بدون رحمة)
    balance = get_bx_balance(uid)
    if balance < amount:
        raise ValueError("INSUFFICIENT_BX")

    update_bx(uid, -amount)

    ledger_entry(
        ref=f"casino:{game}",
        debit_account="user_bx",
        credit_account="casino_pool",
        amount=amount
    )

def casino_credit(uid: int, amount: float, game: str):
    update_bx(uid, amount)

    ledger_entry(
        ref=f"casino:{game}",
        debit_account="casino_pool",
        credit_account="user_bx",
        amount=amount
    )

def casino_history(uid: int, game: str, bet: float, payout: float, win: bool):
    insert_game_history(
        uid=uid,
        game=game,
        bet=bet,
        payout=payout,
        win=win
    )
