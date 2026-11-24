'use strict';

/* BLOXIO AUTH V9 — email verification + server-derived account status */
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../database");
const config = require("../config");
const emailService = require("../services/email");

const JWT_SECRET = config?.security?.jwtSecret;
const BCRYPT_ROUNDS = Number(config?.security?.bcryptRounds || 12);
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";
const VERIFY_TTL_MINUTES = 30;

if (!JWT_SECRET) throw new Error("BLOXIO AUTH: JWT_SECRET is not configured");
if (!Number.isInteger(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
  throw new Error("BLOXIO AUTH: Invalid bcrypt rounds configuration");
}

const normalizeEmail = value => typeof value === "string" ? value.trim().toLowerCase() : "";
const validateEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const sendError = (res, status, error) => res.status(status).json({ success: false, error });
const isBlocked = user => Boolean(user.banned || user.frozen);
const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");

function createAccessToken(user) {
  return jwt.sign({ id: user.id, tokenType: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY, issuer: "bloxio", audience: "bloxio-api"
  });
}
function createRefreshToken(user) {
  return jwt.sign({ id: user.id, tokenType: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY, issuer: "bloxio", audience: "bloxio-api"
  });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: "bloxio", audience: "bloxio-api" });
}
function bearer(req) {
  const value = req.headers.authorization || "";
  const parts = value.split(" ");
  return parts.length === 2 && /^bearer$/i.test(parts[0]) ? parts[1] : null;
}
async function loadUser(id) {
  const result = await db.query(
    `SELECT id, email, role, banned, frozen, email_verified_at, kyc_status
     FROM users WHERE id = $1 LIMIT 1`, [id]
  );
  return result.rows[0] || null;
}
async function authMiddleware(req, res, next) {
  const token = bearer(req);
  if (!token) return sendError(res, 401, "NO_TOKEN");
  let decoded;
  try { decoded = verifyToken(token); }
  catch (_) { return sendError(res, 401, "INVALID_TOKEN"); }
  if (decoded.tokenType !== "access" || !decoded.id) return sendError(res, 401, "INVALID_ACCESS_TOKEN");
  try {
    const user = await loadUser(decoded.id);
    if (!user) return sendError(res, 401, "USER_NOT_FOUND");
    if (isBlocked(user)) return sendError(res, 403, "ACCOUNT_BLOCKED");
    req.user = {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_verified_at),
      kycStatus: user.kyc_status || "not_started",
      role: user.role
    };
    req.auth = { tokenId: decoded.jti || null };
    return next();
  } catch (error) {
    console.error("[BLOXIO AUTH]", error.message);
    return sendError(res, 503, "AUTH_SERVICE_UNAVAILABLE");
  }
}
function requireVerifiedEmail(req, res, next) {
  if (!req.user?.emailVerified) return sendError(res, 403, "EMAIL_VERIFICATION_REQUIRED");
  return next();
}
function requireApprovedKyc(req, res, next) {
  if (req.user?.kycStatus !== "approved") return sendError(res, 403, "KYC_APPROVAL_REQUIRED");
  return next();
}
async function queueVerificationEmail(email, token) {
  const base = String(config?.app?.baseUrl || process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("APP_BASE_URL_NOT_CONFIGURED");
  const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  await emailService.send("verification", email, { verificationUrl: url });
}
function newVerificationToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

/* REGISTER: account is created unverified; token is never returned to the client. */
router.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || !password) return sendError(res, 400, "missing_fields");
    if (!validateEmail(email)) return sendError(res, 400, "invalid_email");
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return sendError(res, 400, "weak_password");
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verification = newVerificationToken();
    const user = await db.transaction(async client => {
      const inserted = await client.query(
        `INSERT INTO users
          (email, password, role, created_at, email_verification_token_hash, email_verification_expires_at, kyc_status)
         VALUES ($1, $2, 'user', NOW(), $3, NOW() + INTERVAL '${VERIFY_TTL_MINUTES} minutes', 'not_started')
         RETURNING id, email, role`,
        [email, passwordHash, verification.hash]
      );
      const newUser = inserted.rows[0];
      await client.query(
        `INSERT INTO wallet_balances (user_id, asset, balance, locked)
         SELECT $1, asset, 0, 0 FROM (VALUES ('BX'), ('USDT'), ('BTC'), ('ETH')) AS assets(asset)`,
        [newUser.id]
      );
      await client.query(`INSERT INTO audit_logs (user_id, action) VALUES ($1, 'register')`, [newUser.id]);
      return newUser;
    });
    try {
      await queueVerificationEmail(email, verification.raw);
    } catch (mailError) {
      console.error("[BLOXIO VERIFY EMAIL QUEUE]", mailError.message);
      return res.status(202).json({
        success: true, emailVerificationRequired: true,
        message: "account_created_email_delivery_pending",
        user: { id: user.id, email: user.email, role: user.role }
      });
    }
    return res.status(201).json({
      success: true, emailVerificationRequired: true,
      message: "verification_email_sent",
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.code === "23505") return sendError(res, 409, "email_exists");
    console.error("[BLOXIO REGISTER]", error.message);
    return sendError(res, 500, "registration_failed");
  }
});

/* VERIFY EMAIL: single-use hashed token with expiry. */
router.post("/verify-email", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return sendError(res, 400, "invalid_or_expired_token");
  try {
    const result = await db.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW()),
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL
       WHERE email_verification_token_hash = $1
         AND email_verification_expires_at > NOW()
       RETURNING id, email, email_verified_at`,
      [hashToken(token)]
    );
    if (!result.rows.length) return sendError(res, 400, "invalid_or_expired_token");
    await db.query(`INSERT INTO audit_logs (user_id, action) VALUES ($1, 'email_verified')`, [result.rows[0].id]);
    return res.json({ success: true, emailVerified: true });
  } catch (error) {
    console.error("[BLOXIO VERIFY EMAIL]", error.message);
    return sendError(res, 500, "email_verification_failed");
  }
});

/* RESEND: authenticated, rate-limited at route/gateway level as an additional safeguard. */
router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    const user = await loadUser(req.user.id);
    if (!user) return sendError(res, 404, "USER_NOT_FOUND");
    if (user.email_verified_at) return res.json({ success: true, emailVerified: true });
    const verification = newVerificationToken();
    await db.query(
      `UPDATE users SET email_verification_token_hash = $1,
       email_verification_expires_at = NOW() + INTERVAL '${VERIFY_TTL_MINUTES} minutes'
       WHERE id = $2`,
      [verification.hash, req.user.id]
    );
    await queueVerificationEmail(user.email, verification.raw);
    return res.json({ success: true, message: "verification_email_sent" });
  } catch (error) {
    console.error("[BLOXIO RESEND VERIFICATION]", error.message);
    return sendError(res, 503, "verification_email_unavailable");
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string") return sendError(res, 400, "missing_fields");
    if (!validateEmail(email)) return sendError(res, 400, "invalid_email");
    const result = await db.query(
      `SELECT id, email, password, role, banned, frozen, email_verified_at, kyc_status
       FROM users WHERE email = $1 LIMIT 1`, [email]
    );
    if (!result.rows.length) return sendError(res, 400, "invalid_credentials");
    const user = result.rows[0];
    if (isBlocked(user)) return sendError(res, 403, "account_blocked");
    if (!await bcrypt.compare(password, user.password)) return sendError(res, 400, "invalid_credentials");
    await db.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);
    await db.query(`INSERT INTO audit_logs (user_id, action) VALUES ($1, 'login')`, [user.id]);
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    return res.json({
      success: true, accessToken, refreshToken, token: accessToken,
      emailVerificationRequired: !user.email_verified_at,
      user: {
        id: user.id, email: user.email, role: user.role,
        emailVerified: Boolean(user.email_verified_at),
        kycStatus: user.kyc_status || "not_started"
      }
    });
  } catch (error) {
    console.error("[BLOXIO LOGIN]", error.message);
    return sendError(res, 500, "login_error");
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const token = req.body?.refreshToken || req.body?.token;
    if (!token) return sendError(res, 401, "missing_refresh_token");
    const decoded = verifyToken(token);
    if (decoded.tokenType !== "refresh" || !decoded.id) return sendError(res, 401, "invalid_refresh");
    const user = await loadUser(decoded.id);
    if (!user) return sendError(res, 401, "USER_NOT_FOUND");
    if (isBlocked(user)) return sendError(res, 403, "ACCOUNT_BLOCKED");
    const accessToken = createAccessToken(user);
    return res.json({ success: true, accessToken, token: accessToken });
  } catch (_) {
    return sendError(res, 401, "invalid_refresh");
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await loadUser(req.user.id);
    if (!user) return sendError(res, 404, "USER_NOT_FOUND");
    return res.json({
      success: true,
      user: {
        id: user.id, email: user.email, role: user.role,
        banned: Boolean(user.banned), frozen: Boolean(user.frozen),
        emailVerified: Boolean(user.email_verified_at),
        emailVerifiedAt: user.email_verified_at,
        kycStatus: user.kyc_status || "not_started"
      }
    });
  } catch (error) {
    console.error("[BLOXIO AUTH ME]", error.message);
    return sendError(res, 500, "user_load_failed");
  }
});

router.post("/logout", (req, res) => res.json({ success: true, message: "logged_out" }));

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.requireVerifiedEmail = requireVerifiedEmail;
module.exports.requireApprovedKyc = requireApprovedKyc;
