"use strict";

/* =========================================================
   BLOXIO CASINO ENGINE — TRANSACTION-SAFE UPDATE
   CommonJS | PostgreSQL | Redis | Provably Fair
========================================================= */

const crypto = require("crypto");

const db = require("../database");
const redis = require("../core/redis");
const ledger = require("../core/ledger");
const risk = require("../core/riskEngine");
const ws = require("../ws/wsHub");
const ai = require("../core/aiEngine");
const whale = require("../core/whaleTracker");
const vip = require("../core/vipSystem");

/* Keep the existing economic settings unchanged. */
const HOUSE_EDGE = 0.01;
const MAX_PAYOUT = 1_000_000;
const ASSET = "BX";
const SEED_CACHE_TTL = 3600;

function hmac(serverSeed, clientSeed, nonce) {
  return crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");
}

function rng({ serverSeed, clientSeed, nonce }) {
  if (!serverSeed || !clientSeed || !Number.isSafeInteger(Number(nonce)) || Number(nonce) < 0) {
    throw new Error("invalid_fairness_state");
  }

  const hash = hmac(serverSeed, clientSeed, Number(nonce));
  const num = parseInt(hash.substring(0, 13), 16);
  return num / 0x1fffffffffffff;
}

function finiteNumber(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`invalid_${name}`);
  return n;
}

function play({ game, r, data = {} }) {
  switch (game) {
    case "coinflip": {
      if (!["heads", "tails"].includes(data.side)) {
        throw new Error("invalid_coinflip_side");
      }

      const side = r > 0.5 ? "heads" : "tails";
      return {
        result: side,
        win: side === data.side,
        multiplier: 2 * (1 - HOUSE_EDGE)
      };
    }

    case "dice": {
      const target = data.target == null ? 50 : finiteNumber(data.target, "target");
      if (target <= 0 || target >= 100) throw new Error("invalid_dice_target");

      const roll = Number((r * 100).toFixed(2));
      return {
        result: roll,
        win: roll > target,
        multiplier: (100 / (100 - target)) * (1 - HOUSE_EDGE)
      };
    }

    case "crash": {
      const cashout = finiteNumber(data.cashout, "cashout");
      if (cashout < 1.01 || cashout > 1000) throw new Error("invalid_cashout");

      const crash = Number((1 / (1 - r)).toFixed(2));
      return {
        result: crash,
        win: crash >= cashout,
        multiplier: cashout * (1 - HOUSE_EDGE)
      };
    }

    default:
      throw new Error("unsupported_game");
  }
}

/*
 * Fetch state for non-transactional consumers.
 * The actual wager path locks and reads the seed row inside its transaction,
 * preventing concurrent requests from reusing a nonce.
 */
async function getState(userId) {
  const cacheKey = `casino:seed:${userId}`;
  const cached = await redis.getCache(cacheKey);
  if (cached && cached.serverSeed && cached.clientSeed &&
      Number.isSafeInteger(Number(cached.nonce))) {
    return { ...cached, nonce: Number(cached.nonce) };
  }

  const result = await db.query(
    `SELECT server_seed, client_seed, nonce
       FROM casino_seeds
      WHERE user_id = $1`,
    [userId]
  );

  if (!result.rows.length) {
    const state = {
      serverSeed: crypto.randomBytes(32).toString("hex"),
      clientSeed: crypto.randomBytes(16).toString("hex"),
      nonce: 0
    };

    await db.query(
      `INSERT INTO casino_seeds (user_id, server_seed, client_seed, nonce)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, state.serverSeed, state.clientSeed]
    );

    return getState(userId);
  }

  const state = {
    serverSeed: result.rows[0].server_seed,
    clientSeed: result.rows[0].client_seed,
    nonce: Number(result.rows[0].nonce)
  };

  await redis.setCache(cacheKey, state, SEED_CACHE_TTL);
  return state;
}

function safeSideEffect(label, callback) {
  return Promise.resolve()
    .then(callback)
    .catch(error => {
      console.error(`[CasinoEngine] ${label} failed after committed wager:`, error.message);
    });
}

async function processGame({ userId, game, bet, data = {} }) {
  if (userId == null || String(userId).trim() === "") {
    throw new Error("authentication_required");
  }

  if (typeof game !== "string" || !game.trim()) {
    throw new Error("invalid_game");
  }

  const wager = finiteNumber(bet, "bet");
  if (wager <= 0) throw new Error("invalid_bet");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("invalid_game_data");
  }

  await risk.check({ userId, amount: wager });

  /* Preserve the existing VIP benefit calculation. */
  const vipInfo = await vip.getVIP(userId);
  const benefits = vip.getBenefits(vipInfo.level);

  if (!benefits || !Number.isFinite(Number(benefits.stakingBoost)) ||
      Number(benefits.stakingBoost) < 0) {
    throw new Error("invalid_vip_benefit");
  }

  const treasury = await whale.treasuryImpact(userId);
  const cacheKey = `casino:seed:${userId}`;

  /*
   * One PostgreSQL transaction owns:
   * - locked seed row and nonce
   * - wallet debit and payout credit (same pg client)
   * - casino session record
   * - nonce increment
   *
   * This fixes db.connect() (not exported by database/index.js) and
   * ensures ledger operations participate in the same transaction.
   */
  const committed = await db.transaction(async client => {
    await client.query(
      `INSERT INTO casino_seeds (user_id, server_seed, client_seed, nonce)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        userId,
        crypto.randomBytes(32).toString("hex"),
        crypto.randomBytes(16).toString("hex")
      ]
    );

    const seedResult = await client.query(
      `SELECT server_seed, client_seed, nonce
         FROM casino_seeds
        WHERE user_id = $1
        FOR UPDATE`,
      [userId]
    );

    if (!seedResult.rows.length) throw new Error("casino_seed_unavailable");

    const row = seedResult.rows[0];
    const state = {
      serverSeed: row.server_seed,
      clientSeed: row.client_seed,
      nonce: Number(row.nonce)
    };

    if (!Number.isSafeInteger(state.nonce) || state.nonce < 0) {
      throw new Error("invalid_fairness_nonce");
    }

    const randomValue = rng(state);
    const gameResult = play({ game, r: randomValue, data });

    let payout = gameResult.win
      ? wager * gameResult.multiplier * Number(benefits.stakingBoost)
      : 0;

    payout = Math.min(payout, MAX_PAYOUT);

    if (treasury === "danger") payout *= 0.8;
    if (!Number.isFinite(payout) || payout < 0) {
      throw new Error("invalid_payout");
    }

    await ledger.debit({
      userId,
      asset: ASSET,
      amount: wager,
      reason: "casino_bet",
      tx: client
    });

    if (payout > 0) {
      await ledger.credit({
        userId,
        asset: ASSET,
        amount: payout,
        reason: "casino_win",
        tx: client
      });
    }

    await client.query(
      `INSERT INTO casino_sessions
        (user_id, game, bet, payout, multiplier, result, nonce, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        userId,
        game,
        wager,
        payout,
        gameResult.multiplier,
        JSON.stringify(gameResult.result),
        state.nonce
      ]
    );

    await client.query(
      `UPDATE casino_seeds
          SET nonce = nonce + 1
        WHERE user_id = $1`,
      [userId]
    );

    return {
      state,
      gameResult,
      payout,
      nonce: state.nonce
    };
  });

  /* Cache is only a read-through optimization; PostgreSQL is authoritative. */
  await safeSideEffect("seed cache invalidation", () => redis.delCache(cacheKey));

  const { state, gameResult, payout, nonce } = committed;

  /* These integrations must not turn a committed wager into an API failure. */
  await Promise.all([
    safeSideEffect("AI memory", () => ai.recordGame({ userId, game, bet: wager, payout })),
    safeSideEffect("whale tracking", () => whale.track({ userId, game, bet: wager, payout })),
    safeSideEffect("VIP XP", () => vip.addXP(userId, wager)),
    safeSideEffect("casino realtime event", () => ws.publish("casino", {
      type: "game",
      user: userId,
      game,
      bet: wager,
      payout
    })),
    payout >= wager * 10
      ? safeSideEffect("big win event", () => ws.publish("casino", {
          type: "big_win",
          user: userId,
          game,
          payout
        }))
      : Promise.resolve()
  ]);

  return {
    game,
    result: gameResult.result,
    payout,
    multiplier: gameResult.multiplier,
    nonce,
    serverSeedHash: crypto.createHash("sha256").update(state.serverSeed).digest("hex"),
    clientSeed: state.clientSeed
  };
}

async function rotateSeed(userId) {
  if (userId == null || String(userId).trim() === "") {
    throw new Error("authentication_required");
  }

  const seed = crypto.randomBytes(32).toString("hex");

  await db.transaction(async client => {
    const current = await client.query(
      `SELECT user_id
         FROM casino_seeds
        WHERE user_id = $1
        FOR UPDATE`,
      [userId]
    );

    if (!current.rows.length) {
      throw new Error("casino_seed_unavailable");
    }

    await client.query(
      `UPDATE casino_seeds
          SET server_seed = $1,
              nonce = 0
        WHERE user_id = $2`,
      [seed, userId]
    );
  });

  await safeSideEffect("seed cache invalidation", () =>
    redis.delCache(`casino:seed:${userId}`)
  );

  return { success: true };
}

function verify({ serverSeed, clientSeed, nonce }) {
  if (typeof serverSeed !== "string" || !serverSeed ||
      typeof clientSeed !== "string" || !clientSeed) {
    throw new Error("invalid_fairness_seeds");
  }

  const n = Number(nonce);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error("invalid_fairness_nonce");
  }

  return rng({ serverSeed, clientSeed, nonce: n });
}

module.exports = {
  processGame,
  rotateSeed,
  verify
};
