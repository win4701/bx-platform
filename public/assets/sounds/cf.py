async def fetch_jetton_meta(session, master):
    cached = get_cached_jetton(master)
    if cached:
        return cached

    async with session.get(
        f"{TON_API}/getJettonData",
        params={"address": master}
    ) as r:
        data = await r.json()

    meta = {
        "symbol": data["result"].get("symbol"),
        "decimals": int(data["result"].get("decimals", 9))
    }
    save_jetton(master, meta["symbol"], meta["decimals"])
    return meta
