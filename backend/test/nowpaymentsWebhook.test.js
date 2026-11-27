"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { verifyNowPaymentsSignature } = require("../security/nowpaymentsWebhook");

const secret = "unit-test-secret";
const payload = { z: 2, payment_id: "p-123", nested: { b: 1, a: 2 } };

function sign(value) {
  const canonical = JSON.stringify({
    nested: { a: 2, b: 1 },
    payment_id: "p-123",
    z: 2
  });
  return crypto.createHmac("sha512", secret).update(canonical).digest("hex");
}

test("accepts a valid signature independent of object insertion order", () => {
  assert.equal(verifyNowPaymentsSignature(payload, sign(payload), secret), true);
});

test("rejects missing, malformed and wrong signatures", () => {
  assert.equal(verifyNowPaymentsSignature(payload, undefined, secret), false);
  assert.equal(verifyNowPaymentsSignature(payload, "abcd", secret), false);
  assert.equal(verifyNowPaymentsSignature(payload, "0".repeat(128), secret), false);
});

test("rejects an absent secret", () => {
  assert.equal(verifyNowPaymentsSignature(payload, sign(payload), ""), false);
});
