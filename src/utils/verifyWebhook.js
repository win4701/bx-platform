import crypto from "crypto";

export function verifyWebhook(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  const sig = req.headers["x-webhook-signature"];
  const ts  = req.headers["x-webhook-timestamp"];

  if (!secret || !sig || !ts) {
    return res.sendStatus(403);
  }

  // منع إعادة الإرسال (Replay)
  const now = Date.now();
  if (Math.abs(now - Number(ts)) > 5 * 60 * 1000) {
    return res.status(403).send("Expired");
  }

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(ts + body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.sendStatus(403);
  }

  next();
}
