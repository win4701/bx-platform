/* =========================================================
   BXS ENTERPRISE SEEDS
========================================================= */

/* =========================================================
   SYSTEM SETTINGS
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES

(
    'platform_name',
    '"BXS Network"'::jsonb,
    NOW()
),

(
    'platform_symbol',
    '"BX"'::jsonb,
    NOW()
),

(
    'platform_decimals',
    '8'::jsonb,
    NOW()
),

(
    'maintenance_mode',
    'false'::jsonb,
    NOW()
),

(
    'exchange_enabled',
    'true'::jsonb,
    NOW()
),

(
    'casino_enabled',
    'true'::jsonb,
    NOW()
),

(
    'payments_enabled',
    'true'::jsonb,
    NOW()
),

(
    'withdraw_enabled',
    'true'::jsonb,
    NOW()
),

(
    'deposit_enabled',
    'true'::jsonb,
    NOW()
)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   ADMIN USER
========================================================= */

INSERT INTO users (

    username,
    email,
    password_hash,
    role,
    level,
    xp,
    email_verified,
    kyc_status,
    created_at

)

VALUES (

    'admin',

    'admin@bxs.network',

    '$2b$10$changemehash',

    'admin',

    999,

    999999,

    true,

    'verified',

    NOW()

)

ON CONFLICT(email)
DO NOTHING;

/* =========================================================
   DEFAULT ASSETS
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'supported_assets',

    '[
        "BX",
        "USDT",
        "BTC",
        "ETH",
        "BNB",
        "TON",
        "SOL",
        "USDC",
        "TRX",
        "LTC"
    ]'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   TRADING PAIRS
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'trading_pairs',

    '[
        "BX_USDT",
        "BTC_USDT",
        "ETH_USDT",
        "TON_USDT",
        "SOL_USDT"
    ]'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   EXCHANGE CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'exchange_config',

    '{
        "maker_fee": 0.001,
        "taker_fee": 0.002,
        "min_order_size": 1,
        "max_order_size": 1000000,
        "max_leverage": 100
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   CASINO CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'casino_config',

    '{
        "house_edge": 0.02,
        "max_bet": 100000,
        "min_bet": 1,
        "provably_fair": true
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   MINING CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'mining_config',

    '{
        "base_reward": 10,
        "halving_interval": 210000,
        "max_power": 1000000
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   AIRDROP CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'airdrop_config',

    '{
        "enabled": true,
        "reward": 100,
        "max_claims": 100000
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   API CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'api_config',

    '{
        "rate_limit": 500,
        "ws_limit": 100,
        "max_connections": 10000
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   TREASURY WALLETS
========================================================= */

INSERT INTO treasury_wallets (

    asset,
    address,
    balance,
    wallet_type,
    created_at

)

VALUES

(
    'BX',
    'BXS_TREASURY_MAIN',
    1000000000,
    'cold',
    NOW()
),

(
    'USDT',
    'USDT_HOT_WALLET',
    1000000,
    'hot',
    NOW()
),

(
    'BTC',
    'BTC_HOT_WALLET',
    100,
    'hot',
    NOW()
),

(
    'ETH',
    'ETH_HOT_WALLET',
    1000,
    'hot',
    NOW()
)

/* =========================================================
   DEFAULT METRICS
========================================================= */

INSERT INTO system_metrics (

    metric,
    value,
    created_at

)

VALUES

(
    'users_total',
    0,
    NOW()
),

(
    'trades_total',
    0,
    NOW()
),

(
    'wallet_volume',
    0,
    NOW()
),

(
    'casino_volume',
    0,
    NOW()
),

(
    'exchange_volume',
    0,
    NOW()
);

/* =========================================================
   NOTIFICATIONS
========================================================= */

INSERT INTO notifications (

    user_id,
    type,
    title,
    body,
    read,
    created_at

)

SELECT

    id,

    'system',

    'Welcome to BXS Network',

    'Your account has been initialized.',

    false,

    NOW()

FROM users

WHERE role = 'admin';

/* =========================================================
   DEFAULT API KEY
========================================================= */

INSERT INTO api_keys (

    user_id,
    api_key,
    api_secret,
    permissions,
    created_at

)

SELECT

    id,

    'BXS_PUBLIC_KEY',

    'BXS_SECRET_KEY',

    '[
        "wallet",
        "market",
        "payments",
        "casino"
    ]'::jsonb,

    NOW()

FROM users

WHERE role = 'admin';

/* =========================================================
   DEFAULT CLUSTER NODE
========================================================= */

INSERT INTO cluster_nodes (

    node_name,
    node_type,
    status,
    heartbeat_at,
    created_at

)

VALUES (

    'bxs-core-node',

    'core',

    'online',

    NOW(),

    NOW()

);

/* =========================================================
   MATCHING ENGINE CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'matching_engine',

    '{
        "mode": "ultra-low-latency",
        "shards": 4,
        "workers": 8,
        "max_orderbook_depth": 1000
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   BLOCKCHAIN CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'blockchain_config',

    '{
        "chain": "BXS",
        "symbol": "BX",
        "supply": 1000000000,
        "decimals": 8,
        "gas_token": "BX"
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   DEFAULT FRAUD RULES
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'fraud_rules',

    '{
        "max_single_tx": 100000,
        "max_daily_withdraw": 500000,
        "max_login_attempts": 5,
        "velocity_window": 60
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   SYSTEM JOBS
========================================================= */

INSERT INTO system_jobs (

    queue,
    payload,
    status,
    retries,
    created_at

)

VALUES

(
    'metrics',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
),

(
    'cleanup',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
),

(
    'fraud',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
),

(
    'blockchain',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
);

/* =========================================================
   FINAL SEED COMPLETE
========================================================= */

INSERT INTO audit_logs (

    action,
    meta,
    created_at

)

VALUES (

    'seed_complete',

    jsonb_build_object(

        'system', 'BXS',

        'version', 'enterprise'

    ),

    NOW()

);
