"use strict";

/**
 * Canonical authentication adapter.
 * The auth module validates issuer, audience, token type, account state and user existence.
 * This adapter intentionally contains no independent JWT verification logic.
 */
const authModule = require("../modules/auth");

if (typeof authModule.authMiddleware !== "function") {
  throw new Error("BLOXIO_AUTH_MIDDLEWARE_UNAVAILABLE");
}

module.exports = authModule.authMiddleware;
