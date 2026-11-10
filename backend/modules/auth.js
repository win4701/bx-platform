
"use strict";

/* =========================================================
   BLOXIO AUTH SYSTEM V8
   SECURE JWT AUTHENTICATION
   ACCESS / REFRESH TOKEN SEPARATION
   TRANSACTIONAL REGISTRATION
   API V7 + ROUTES V8 COMPATIBLE
========================================================= */

const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = require("../database");
const config = require("../config");

/* =========================================================
   CONFIGURATION
========================================================= */

const JWT_SECRET = config?.security?.jwtSecret;

const BCRYPT_ROUNDS = Number(
  config?.security?.bcryptRounds || 12
);

const ACCESS_TOKEN_EXPIRY = "15m";

const REFRESH_TOKEN_EXPIRY = "30d";

if (!JWT_SECRET) {
  throw new Error(
    "BLOXIO AUTH: JWT_SECRET is not configured"
  );
}

if (
  !Number.isInteger(BCRYPT_ROUNDS) ||
  BCRYPT_ROUNDS < 10 ||
  BCRYPT_ROUNDS > 15
) {
  throw new Error(
    "BLOXIO AUTH: Invalid bcrypt rounds configuration"
  );
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(email) {

  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();

}

function validateEmail(email) {

  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );

}

function validatePassword(password) {

  if (
    typeof password !== "string" ||
    password.length < 6 ||
    password.length > 128
  ) {
    throw new Error("weak_password");
  }

}

function createAccessToken(user) {

  return jwt.sign(
    {
      id: user.id,
      tokenType: "access"
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: "bloxio",
      audience: "bloxio-api"
    }
  );

}

function createRefreshToken(user) {

  return jwt.sign(
    {
      id: user.id,
      tokenType: "refresh"
    },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: "bloxio",
      audience: "bloxio-api"
    }
  );

}

function verifyToken(token) {

  return jwt.verify(
    token,
    JWT_SECRET,
    {
      issuer: "bloxio",
      audience: "bloxio-api"
    }
  );

}

function sendError(res, status, error) {

  return res.status(status).json({
    success: false,
    error
  });

}

function getBearerToken(req) {

  const authorization =
    req.headers.authorization || "";

  const parts = authorization.split(" ");

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer" ||
    !parts[1]
  ) {
    return null;
  }

  return parts[1];

}

function isBlocked(user) {

  return Boolean(
    user.banned || user.frozen
  );

}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

async function authMiddleware(req, res, next) {

  const token = getBearerToken(req);

  if (!token) {

    return sendError(
      res,
      401,
      "NO_TOKEN"
    );

  }

  let decoded;

  try {

    decoded = verifyToken(token);

  } catch (error) {

    return sendError(
      res,
      401,
      "INVALID_TOKEN"
    );

  }

  // Reject refresh tokens on protected API routes.
  if (
    decoded.tokenType !== "access" ||
    !decoded.id
  ) {

    return sendError(
      res,
      401,
      "INVALID_ACCESS_TOKEN"
    );

  }

  try {

    const result = await db.query(
      `
        SELECT id, banned, frozen
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [decoded.id]
    );

    if (!result.rows.length) {

      return sendError(
        res,
        401,
        "USER_NOT_FOUND"
      );

    }

    const user = result.rows[0];

    if (isBlocked(user)) {

      return sendError(
        res,
        403,
        "ACCOUNT_BLOCKED"
      );

    }

    req.user = {
      id: user.id
    };

    req.auth = {
      tokenId: decoded.jti || null
    };

    return next();

  } catch (error) {

    console.error(
      "[BLOXIO AUTH MIDDLEWARE]",
      error.message
    );

    return sendError(
      res,
      500,
      "AUTH_SERVICE_UNAVAILABLE"
    );

  }

}

/* =========================================================
   REGISTER
========================================================= */

router.post("/register", async (req, res) => {

  try {

    const email = normalizeEmail(
      req.body?.email
    );

    const password = req.body?.password;

    if (!email || !password) {

      return sendError(
        res,
        400,
        "missing_fields"
      );

    }

    if (!validateEmail(email)) {

      return sendError(
        res,
        400,
        "invalid_email"
      );

    }

    validatePassword(password);

    const passwordHash = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    // Registration is atomic: user, wallets and audit.
    const user = await db.transaction(
      async (client) => {

        const existing = await client.query(
          `
            SELECT id
            FROM users
            WHERE email = $1
            LIMIT 1
          `,
          [email]
        );

        if (existing.rows.length) {

          throw new Error("email_exists");

        }

        const inserted = await client.query(
          `
            INSERT INTO users (
              email,
              password,
              role,
              created_at
            )
            VALUES ($1, $2, 'user', NOW())
            RETURNING id, email, role
          `,
          [email, passwordHash]
        );

        const newUser = inserted.rows[0];

        await client.query(
          `
            INSERT INTO wallet_balances (
              user_id,
              asset,
              balance,
              locked
            )
            SELECT
              $1,
              asset,
              0,
              0
            FROM (
              VALUES
                ('BX'),
                ('USDT'),
                ('BTC'),
                ('ETH')
            ) AS assets(asset)
          `,
          [newUser.id]
        );

        await client.query(
          `
            INSERT INTO audit_logs (
              user_id,
              action
            )
            VALUES ($1, 'register')
          `,
          [newUser.id]
        );

        return newUser;

      }
    );

    const accessToken = createAccessToken(user);

    const refreshToken = createRefreshToken(user);

    return res.status(201).json({

      success: true,

      accessToken,

      refreshToken,

      // Compatibility with older frontend code.
      token: accessToken,

      user

    });

  } catch (error) {

    if (
      error.message === "email_exists" ||
      error.code === "23505"
    ) {

      return sendError(
        res,
        409,
        "email_exists"
      );

    }

    if (error.message === "weak_password") {

      return sendError(
        res,
        400,
        "weak_password"
      );

    }

    console.error(
      "[BLOXIO REGISTER]",
      error.message
    );

    return sendError(
      res,
      500,
      "registration_failed"
    );

  }

});

/* =========================================================
   LOGIN
========================================================= */

router.post("/login", async (req, res) => {

  try {

    const email = normalizeEmail(
      req.body?.email
    );

    const password = req.body?.password;

    if (
      !email ||
      !password ||
      typeof password !== "string"
    ) {

      return sendError(
        res,
        400,
        "missing_fields"
      );

    }

    if (!validateEmail(email)) {

      return sendError(
        res,
        400,
        "invalid_email"
      );

    }

    const result = await db.query(
      `
        SELECT
          id,
          email,
          password,
          role,
          banned,
          frozen
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

    if (!result.rows.length) {

      return sendError(
        res,
        400,
        "invalid_credentials"
      );

    }

    const user = result.rows[0];

    if (isBlocked(user)) {

      return sendError(
        res,
        403,
        "account_blocked"
      );

    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {

      return sendError(
        res,
        400,
        "invalid_credentials"
      );

    }

    await db.query(
      `
        UPDATE users
        SET last_login = NOW()
        WHERE id = $1
      `,
      [user.id]
    );

    await db.query(
      `
        INSERT INTO audit_logs (
          user_id,
          action
        )
        VALUES ($1, 'login')
      `,
      [user.id]
    );

    const accessToken = createAccessToken(user);

    const refreshToken = createRefreshToken(user);

    return res.json({

      success: true,

      accessToken,

      refreshToken,

      token: accessToken,

      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }

    });

  } catch (error) {

    console.error(
      "[BLOXIO LOGIN]",
      error.message
    );

    return sendError(
      res,
      500,
      "login_error"
    );

  }

});

/* =========================================================
   REFRESH TOKEN
========================================================= */

router.post("/refresh", async (req, res) => {

  try {

    const refreshToken =
      req.body?.refreshToken ||
      req.body?.token;

    if (!refreshToken) {

      return sendError(
        res,
        401,
        "missing_refresh_token"
      );

    }

    const decoded = verifyToken(refreshToken);

    if (
      decoded.tokenType !== "refresh" ||
      !decoded.id
    ) {

      return sendError(
        res,
        401,
        "invalid_refresh"
      );

    }

    const result = await db.query(
      `
        SELECT id, banned, frozen
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [decoded.id]
    );

    if (!result.rows.length) {

      return sendError(
        res,
        401,
        "USER_NOT_FOUND"
      );

    }

    const user = result.rows[0];

    if (isBlocked(user)) {

      return sendError(
        res,
        403,
        "ACCOUNT_BLOCKED"
      );

    }

    const accessToken = createAccessToken(user);

    return res.json({

      success: true,

      accessToken,

      token: accessToken

    });

  } catch (error) {

    return sendError(
      res,
      401,
      "invalid_refresh"
    );

  }

});

/* =========================================================
   CURRENT USER
========================================================= */

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {

    try {

      const result = await db.query(
        `
          SELECT
            id,
            email,
            role,
            banned,
            frozen
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [req.user.id]
      );

      if (!result.rows.length) {

        return sendError(
          res,
          404,
          "USER_NOT_FOUND"
        );

      }

      return res.json({

        success: true,

        user: result.rows[0]

      });

    } catch (error) {

      console.error(
        "[BLOXIO AUTH ME]",
        error.message
      );

      return sendError(
        res,
        500,
        "user_load_failed"
      );

    }

  }
);

/* =========================================================
   LOGOUT
========================================================= */

// Current implementation is stateless.
// The client clears its local session.
// Server-side token revocation requires a token/session store.

router.post("/logout", (req, res) => {

  return res.json({

    success: true,

    message: "logged_out"

  });

});

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;

module.exports.authMiddleware = authMiddleware;
