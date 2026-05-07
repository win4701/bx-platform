/* =========================================================
   BXS ENTERPRISE BACKUP INFRASTRUCTURE
========================================================= */

/* =========================================================
   BACKUP LOGS
========================================================= */

CREATE TABLE IF NOT EXISTS backup_logs (

    id BIGSERIAL PRIMARY KEY,

    backup_type VARCHAR(50),

    backup_name TEXT,

    backup_size BIGINT,

    status VARCHAR(20),

    checksum TEXT,

    started_at TIMESTAMP,

    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   RESTORE LOGS
========================================================= */

CREATE TABLE IF NOT EXISTS restore_logs (

    id BIGSERIAL PRIMARY KEY,

    restore_name TEXT,

    source_backup TEXT,

    status VARCHAR(20),

    started_at TIMESTAMP,

    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   WAL ARCHIVE CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'wal_backup_config',

    '{
        "enabled": true,
        "archive_mode": "on",
        "compression": true,
        "retention_days": 30
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   FULL BACKUP CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'full_backup_config',

    '{
        "enabled": true,
        "schedule": "daily",
        "compression": "gzip",
        "retention_days": 14
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   INCREMENTAL BACKUP CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'incremental_backup_config',

    '{
        "enabled": true,
        "interval_hours": 1,
        "retention_days": 7
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   SNAPSHOT CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'snapshot_config',

    '{
        "enabled": true,
        "tables": [
            "wallet_balances",
            "orders",
            "trades",
            "audit_logs"
        ]
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   BACKUP METRICS
========================================================= */

INSERT INTO system_metrics (

    metric,
    value,
    created_at

)

VALUES

(
    'backup_success_total',
    0,
    NOW()
),

(
    'backup_failed_total',
    0,
    NOW()
),

(
    'restore_success_total',
    0,
    NOW()
),

(
    'restore_failed_total',
    0,
    NOW()
);

/* =========================================================
   FULL BACKUP FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_log_backup(

    p_type VARCHAR,
    p_name TEXT,
    p_size BIGINT,
    p_status VARCHAR,
    p_checksum TEXT

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO backup_logs (

        backup_type,
        backup_name,
        backup_size,
        status,
        checksum,
        started_at,
        completed_at,
        created_at

    )

    VALUES (

        p_type,
        p_name,
        p_size,
        p_status,
        p_checksum,
        NOW(),
        NOW(),
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   RESTORE FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_log_restore(

    p_restore TEXT,
    p_source TEXT,
    p_status VARCHAR

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO restore_logs (

        restore_name,
        source_backup,
        status,
        started_at,
        completed_at,
        created_at

    )

    VALUES (

        p_restore,
        p_source,
        p_status,
        NOW(),
        NOW(),
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   BACKUP CHECKSUM FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_backup_checksum(

    p_backup TEXT

)

RETURNS TEXT AS $$

DECLARE

    checksum TEXT;

BEGIN

    checksum :=
        md5(
            p_backup ||
            NOW()::TEXT
        );

    RETURN checksum;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   BACKUP RETENTION FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_cleanup_old_backups(

    p_days INT

)

RETURNS VOID AS $$

BEGIN

    DELETE FROM backup_logs

    WHERE created_at <
        NOW() -
        (p_days || ' days')::INTERVAL;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   SNAPSHOT FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_snapshot_wallets()
RETURNS VOID AS $$

BEGIN

    CREATE TABLE IF NOT EXISTS wallet_balances_snapshot AS

    SELECT *

    FROM wallet_balances;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   AUDIT SNAPSHOT FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_snapshot_audit()
RETURNS VOID AS $$

BEGIN

    CREATE TABLE IF NOT EXISTS audit_logs_snapshot AS

    SELECT *

    FROM audit_logs;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   VERIFY BACKUP FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_verify_backup(

    p_checksum TEXT,
    p_expected TEXT

)

RETURNS BOOLEAN AS $$

BEGIN

    RETURN p_checksum = p_expected;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   RECOVERY POINT FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_create_recovery_point(

    p_name TEXT

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO audit_logs (

        action,
        meta,
        created_at

    )

    VALUES (

        'recovery_point',

        jsonb_build_object(

            'name', p_name,

            'timestamp', NOW()

        ),

        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   BACKUP ALERT FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_backup_alert(

    p_message TEXT

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO notifications (

        type,
        title,
        body,
        created_at

    )

    VALUES (

        'backup',

        'Backup Alert',

        p_message,

        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   DISASTER RECOVERY CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'disaster_recovery',

    '{
        "enabled": true,
        "multi_region": false,
        "replica_required": true,
        "pitr_enabled": true,
        "recovery_target_minutes": 15
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   ARCHIVE CONFIG
========================================================= */

INSERT INTO system_settings (

    key,
    value,
    updated_at

)

VALUES (

    'archive_config',

    '{
        "compress": true,
        "algorithm": "gzip",
        "encrypt": false,
        "retention_months": 12
    }'::jsonb,

    NOW()

)

ON CONFLICT(key)
DO NOTHING;

/* =========================================================
   BACKUP QUEUES
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
    'backup_full',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
),

(
    'backup_incremental',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
),

(
    'backup_cleanup',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
),

(
    'backup_verify',
    '{}'::jsonb,
    'pending',
    0,
    NOW()
);

/* =========================================================
   BACKUP INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_backup_logs_created
ON backup_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_logs_status
ON backup_logs(status);

CREATE INDEX IF NOT EXISTS idx_restore_logs_created
ON restore_logs(created_at DESC);

/* =========================================================
   BACKUP AUDIT
========================================================= */

INSERT INTO audit_logs (

    action,
    meta,
    created_at

)

VALUES (

    'backup_system_initialized',

    jsonb_build_object(

        'system', 'BXS',

        'mode', 'enterprise'

    ),

    NOW()

);
