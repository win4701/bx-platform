/* =========================================================
   BXS ENTERPRISE PARTITIONS
========================================================= */

/* =========================================================
   TRADES PARTITIONED TABLE
========================================================= */

ALTER TABLE trades
PARTITION BY RANGE (created_at);

/* =========================================================
   TRADES 2025 PARTITIONS
========================================================= */

CREATE TABLE IF NOT EXISTS trades_2025_01
PARTITION OF trades
FOR VALUES FROM ('2025-01-01')
TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS trades_2025_02
PARTITION OF trades
FOR VALUES FROM ('2025-02-01')
TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS trades_2025_03
PARTITION OF trades
FOR VALUES FROM ('2025-03-01')
TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS trades_2025_04
PARTITION OF trades
FOR VALUES FROM ('2025-04-01')
TO ('2025-05-01');

/* =========================================================
   TRADES INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_trades_2025_01_pair
ON trades_2025_01(pair, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_2025_02_pair
ON trades_2025_02(pair, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_2025_03_pair
ON trades_2025_03(pair, created_at DESC);

/* =========================================================
   WALLET TRANSACTIONS PARTITION
========================================================= */

ALTER TABLE wallet_transactions
PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS wallet_tx_2025_01
PARTITION OF wallet_transactions
FOR VALUES FROM ('2025-01-01')
TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS wallet_tx_2025_02
PARTITION OF wallet_transactions
FOR VALUES FROM ('2025-02-01')
TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS wallet_tx_2025_03
PARTITION OF wallet_transactions
FOR VALUES FROM ('2025-03-01')
TO ('2025-04-01');

/* =========================================================
   WALLET TX INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_wallet_tx_2025_01_user
ON wallet_tx_2025_01(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_2025_02_user
ON wallet_tx_2025_02(user_id, created_at DESC);

/* =========================================================
   AUDIT LOGS PARTITION
========================================================= */

ALTER TABLE audit_logs
PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit_logs_2025_01
PARTITION OF audit_logs
FOR VALUES FROM ('2025-01-01')
TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS audit_logs_2025_02
PARTITION OF audit_logs
FOR VALUES FROM ('2025-02-01')
TO ('2025-03-01');

/* =========================================================
   AUDIT INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_audit_2025_01_user
ON audit_logs_2025_01(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_2025_02_action
ON audit_logs_2025_02(action, created_at DESC);

/* =========================================================
   CANDLES HASH PARTITION
========================================================= */

ALTER TABLE candles
PARTITION BY HASH (pair);

CREATE TABLE IF NOT EXISTS candles_p0
PARTITION OF candles
FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE IF NOT EXISTS candles_p1
PARTITION OF candles
FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE IF NOT EXISTS candles_p2
PARTITION OF candles
FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE IF NOT EXISTS candles_p3
PARTITION OF candles
FOR VALUES WITH (MODULUS 4, REMAINDER 3);

/* =========================================================
   CANDLE INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_candles_p0_pair
ON candles_p0(pair, timeframe, ts DESC);

CREATE INDEX IF NOT EXISTS idx_candles_p1_pair
ON candles_p1(pair, timeframe, ts DESC);

/* =========================================================
   BLOCKCHAIN EVENTS PARTITION
========================================================= */

ALTER TABLE blockchain_events
PARTITION BY RANGE (block_number);

CREATE TABLE IF NOT EXISTS blockchain_events_0_1m
PARTITION OF blockchain_events
FOR VALUES FROM (0)
TO (1000000);

CREATE TABLE IF NOT EXISTS blockchain_events_1m_2m
PARTITION OF blockchain_events
FOR VALUES FROM (1000000)
TO (2000000);

/* =========================================================
   BLOCKCHAIN INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_blockchain_0_1m_tx
ON blockchain_events_0_1m(tx_hash);

CREATE INDEX IF NOT EXISTS idx_blockchain_1m_2m_tx
ON blockchain_events_1m_2m(tx_hash);

/* =========================================================
   MATCHING EVENTS PARTITION
========================================================= */

ALTER TABLE matching_events
PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS matching_events_2025_01
PARTITION OF matching_events
FOR VALUES FROM ('2025-01-01')
TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS matching_events_2025_02
PARTITION OF matching_events
FOR VALUES FROM ('2025-02-01')
TO ('2025-03-01');

/* =========================================================
   MATCHING INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_matching_2025_01_pair
ON matching_events_2025_01(pair, sequence);

CREATE INDEX IF NOT EXISTS idx_matching_2025_02_pair
ON matching_events_2025_02(pair, sequence);

/* =========================================================
   SYSTEM METRICS PARTITION
========================================================= */

ALTER TABLE system_metrics
PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS metrics_2025_01
PARTITION OF system_metrics
FOR VALUES FROM ('2025-01-01')
TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS metrics_2025_02
PARTITION OF system_metrics
FOR VALUES FROM ('2025-02-01')
TO ('2025-03-01');

/* =========================================================
   METRICS INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_metrics_2025_01_name
ON metrics_2025_01(metric, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_2025_02_name
ON metrics_2025_02(metric, created_at DESC);

/* =========================================================
   AUTO PARTITION FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_create_month_partition(

    table_name TEXT,
    start_date DATE

)

RETURNS VOID AS $$

DECLARE

    end_date DATE;

    partition_name TEXT;

BEGIN

    end_date :=
        start_date +
        INTERVAL '1 month';

    partition_name :=
        table_name || '_' ||
        TO_CHAR(
            start_date,
            'YYYY_MM'
        );

    EXECUTE format(

        'CREATE TABLE IF NOT EXISTS %I
         PARTITION OF %I
         FOR VALUES FROM (%L)
         TO (%L)',

        partition_name,

        table_name,

        start_date,

        end_date

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   CLEAN OLD PARTITIONS
========================================================= */

CREATE OR REPLACE FUNCTION fn_drop_old_partitions(

    p_table TEXT,
    p_keep_months INT

)

RETURNS VOID AS $$

DECLARE

    rec RECORD;

BEGIN

    FOR rec IN

        SELECT inhrelid::regclass AS partition_name

        FROM pg_inherits

        WHERE inhparent =
            p_table::regclass

    LOOP

        -- custom retention logic placeholder

        RAISE NOTICE
        'Checking partition: %',
        rec.partition_name;

    END LOOP;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   DEFAULT PARTITIONS
========================================================= */

CREATE TABLE IF NOT EXISTS trades_default
PARTITION OF trades DEFAULT;

CREATE TABLE IF NOT EXISTS wallet_tx_default
PARTITION OF wallet_transactions DEFAULT;

CREATE TABLE IF NOT EXISTS audit_logs_default
PARTITION OF audit_logs DEFAULT;

CREATE TABLE IF NOT EXISTS candles_default
PARTITION OF candles DEFAULT;

/* =========================================================
   ANALYZE
========================================================= */

ANALYZE trades;

ANALYZE wallet_transactions;

ANALYZE audit_logs;

ANALYZE candles;

ANALYZE blockchain_events;

ANALYZE matching_events;
