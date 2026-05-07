/* =========================================================
   BXS ENTERPRISE TRIGGERS
========================================================= */

/* =========================================================
   UPDATED_AT FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   USERS UPDATED_AT
========================================================= */

DROP TRIGGER IF EXISTS trg_users_updated
ON users;

CREATE TRIGGER trg_users_updated
BEFORE UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

/* =========================================================
   WALLET BALANCES UPDATED_AT
========================================================= */

DROP TRIGGER IF EXISTS trg_wallet_balances_updated
ON wallet_balances;

CREATE TRIGGER trg_wallet_balances_updated
BEFORE UPDATE
ON wallet_balances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

/* =========================================================
   ORDERS UPDATED_AT
========================================================= */

DROP TRIGGER IF EXISTS trg_orders_updated
ON orders;

CREATE TRIGGER trg_orders_updated
BEFORE UPDATE
ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

/* =========================================================
   AUDIT FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$

BEGIN

    INSERT INTO audit_logs (

        user_id,
        action,
        meta,
        created_at

    )

    VALUES (

        COALESCE(
            NEW.user_id,
            OLD.user_id
        ),

        TG_TABLE_NAME || '_' || TG_OP,

        jsonb_build_object(

            'old', to_jsonb(OLD),

            'new', to_jsonb(NEW)

        ),

        NOW()

    );

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   WALLET TX AUDIT
========================================================= */

DROP TRIGGER IF EXISTS trg_wallet_tx_audit
ON wallet_transactions;

CREATE TRIGGER trg_wallet_tx_audit
AFTER INSERT
ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

/* =========================================================
   PAYMENTS AUDIT
========================================================= */

DROP TRIGGER IF EXISTS trg_payments_audit
ON payments;

CREATE TRIGGER trg_payments_audit
AFTER INSERT OR UPDATE
ON payments
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

/* =========================================================
   WITHDRAW AUDIT
========================================================= */

DROP TRIGGER IF EXISTS trg_withdraw_audit
ON withdraw_requests;

CREATE TRIGGER trg_withdraw_audit
AFTER INSERT OR UPDATE
ON withdraw_requests
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

/* =========================================================
   TRADES AUDIT
========================================================= */

DROP TRIGGER IF EXISTS trg_trades_audit
ON trades;

CREATE TRIGGER trg_trades_audit
AFTER INSERT
ON trades
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

/* =========================================================
   CASINO AUDIT
========================================================= */

DROP TRIGGER IF EXISTS trg_casino_audit
ON casino_sessions;

CREATE TRIGGER trg_casino_audit
AFTER INSERT
ON casino_sessions
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

/* =========================================================
   NEGATIVE BALANCE PROTECTION
========================================================= */

CREATE OR REPLACE FUNCTION prevent_negative_balance()
RETURNS TRIGGER AS $$

BEGIN

    IF NEW.balance < 0 THEN

        RAISE EXCEPTION
        'negative_balance_not_allowed';

    END IF;

    IF NEW.locked < 0 THEN

        RAISE EXCEPTION
        'negative_locked_balance';

    END IF;

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   BALANCE PROTECTION TRIGGER
========================================================= */

DROP TRIGGER IF EXISTS trg_prevent_negative_balance
ON wallet_balances;

CREATE TRIGGER trg_prevent_negative_balance
BEFORE UPDATE
ON wallet_balances
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_balance();

/* =========================================================
   ORDER REMAINING VALIDATION
========================================================= */

CREATE OR REPLACE FUNCTION validate_order_remaining()
RETURNS TRIGGER AS $$

BEGIN

    IF NEW.remaining < 0 THEN

        RAISE EXCEPTION
        'invalid_remaining';

    END IF;

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   ORDER VALIDATION TRIGGER
========================================================= */

DROP TRIGGER IF EXISTS trg_validate_order_remaining
ON orders;

CREATE TRIGGER trg_validate_order_remaining
BEFORE UPDATE
ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_remaining();

/* =========================================================
   AUTO NOTIFICATION FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$

BEGIN

    INSERT INTO notifications (

        user_id,
        type,
        title,
        body,
        created_at

    )

    VALUES (

        NEW.user_id,

        TG_TABLE_NAME,

        TG_TABLE_NAME || '_event',

        TG_OP || ' on ' || TG_TABLE_NAME,

        NOW()

    );

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   PAYMENT NOTIFICATIONS
========================================================= */

DROP TRIGGER IF EXISTS trg_payment_notify
ON payments;

CREATE TRIGGER trg_payment_notify
AFTER INSERT
ON payments
FOR EACH ROW
EXECUTE FUNCTION create_notification();

/* =========================================================
   WITHDRAW NOTIFICATIONS
========================================================= */

DROP TRIGGER IF EXISTS trg_withdraw_notify
ON withdraw_requests;

CREATE TRIGGER trg_withdraw_notify
AFTER INSERT
ON withdraw_requests
FOR EACH ROW
EXECUTE FUNCTION create_notification();

/* =========================================================
   CASINO NOTIFICATIONS
========================================================= */

DROP TRIGGER IF EXISTS trg_casino_notify
ON casino_sessions;

CREATE TRIGGER trg_casino_notify
AFTER INSERT
ON casino_sessions
FOR EACH ROW
EXECUTE FUNCTION create_notification();

/* =========================================================
   FRAUD DETECTION FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION detect_large_transaction()
RETURNS TRIGGER AS $$

BEGIN

    IF NEW.amount > 100000 THEN

        INSERT INTO fraud_events (

            user_id,
            risk_score,
            event_type,
            details,
            created_at

        )

        VALUES (

            NEW.user_id,

            90,

            'large_transaction',

            jsonb_build_object(

                'amount', NEW.amount,

                'asset', NEW.asset

            ),

            NOW()

        );

    END IF;

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   FRAUD TRIGGER
========================================================= */

DROP TRIGGER IF EXISTS trg_detect_large_tx
ON wallet_transactions;

CREATE TRIGGER trg_detect_large_tx
AFTER INSERT
ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION detect_large_transaction();

/* =========================================================
   REFERRAL REWARD FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION process_referral_reward()
RETURNS TRIGGER AS $$

DECLARE

    referrer BIGINT;

BEGIN

    SELECT referred_by
    INTO referrer
    FROM users
    WHERE id = NEW.user_id;

    IF referrer IS NOT NULL THEN

        INSERT INTO referrals (

            referrer_id,
            referred_id,
            reward,
            created_at

        )

        VALUES (

            referrer,
            NEW.user_id,
            NEW.amount * 0.01,
            NOW()

        );

    END IF;

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   REFERRAL TRIGGER
========================================================= */

DROP TRIGGER IF EXISTS trg_referral_rewards
ON wallet_transactions;

CREATE TRIGGER trg_referral_rewards
AFTER INSERT
ON wallet_transactions
FOR EACH ROW
WHEN (NEW.type = 'deposit')
EXECUTE FUNCTION process_referral_reward();

/* =========================================================
   SYSTEM METRICS FUNCTION
========================================================= */

CREATE OR REPLACE FUNCTION update_metrics()
RETURNS TRIGGER AS $$

BEGIN

    INSERT INTO system_metrics (

        metric,
        value,
        created_at

    )

    VALUES (

        TG_TABLE_NAME || '_count',

        1,

        NOW()

    );

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   METRICS TRIGGERS
========================================================= */

DROP TRIGGER IF EXISTS trg_metrics_trades
ON trades;

CREATE TRIGGER trg_metrics_trades
AFTER INSERT
ON trades
FOR EACH ROW
EXECUTE FUNCTION update_metrics();

DROP TRIGGER IF EXISTS trg_metrics_wallet
ON wallet_transactions;

CREATE TRIGGER trg_metrics_wallet
AFTER INSERT
ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_metrics();

/* =========================================================
   IMMUTABLE LEDGER PROTECTION
========================================================= */

CREATE OR REPLACE FUNCTION prevent_wallet_tx_delete()
RETURNS TRIGGER AS $$

BEGIN

    RAISE EXCEPTION
    'wallet_transactions_are_immutable';

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   IMMUTABLE TRIGGER
========================================================= */

DROP TRIGGER IF EXISTS trg_wallet_tx_delete
ON wallet_transactions;

CREATE TRIGGER trg_wallet_tx_delete
BEFORE DELETE
ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_wallet_tx_delete();

/* =========================================================
   LOGIN TRACKING
========================================================= */

CREATE OR REPLACE FUNCTION track_login()
RETURNS TRIGGER AS $$

BEGIN

    UPDATE users
    SET last_login_at = NOW()
    WHERE id = NEW.user_id;

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   LOGIN TRIGGER
========================================================= */

DROP TRIGGER IF EXISTS trg_track_login
ON user_sessions;

CREATE TRIGGER trg_track_login
AFTER INSERT
ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION track_login();
