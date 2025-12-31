import crypto from "crypto";

export function telegramAuth(req, res, next) {
  const initData = req.headers["x-telegram-init-data"];
  if (!initData) return res.status(401).json({ error: "NO_INIT_DATA" });

  const secret = crypto
    .createHash("sha256")
    .update(process.env.BOT_TOKEN)
    .digest();

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (hmac !== hash) {
    return res.status(403).json({ error: "INVALID_SIGNATURE" });
  }

  req.telegram = { user: JSON.parse(params.get("user")) };
  next();
}
