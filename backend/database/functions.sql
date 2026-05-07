/* =========================================================
   BXS ENTERPRISE FUNCTIONS
========================================================= */

/* =========================================================
   UPDATE UPDATED_AT
========================================================= */

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   WALLET CREDIT
========================================================= */

CREATE OR REPLACE FUNCTION fn_wallet_credit(

    p_user_id BIGINT,
    p_asset VARCHAR,
    p_amount NUMERIC,
    p_reason TEXT

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO wallet_balances (

        user_id,
        asset,
        balance

    )

    VALUES (

        p_user_id,
        p_asset,
        p_amount

    )

    ON CONFLICT (user_id, asset)

    DO UPDATE

    SET balance =
        wallet_balances.balance + p_amount,

        updated_at = NOW();

    INSERT INTO wallet_transactions (

        user_id,
        asset,
        amount,
        type,
        reason,
        created_at

    )

    VALUES (

        p_user_id,
        p_asset,
        p_amount,
        'credit',
        p_reason,
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   WALLET DEBIT
========================================================= */

CREATE OR REPLACE FUNCTION fn_wallet_debit(

    p_user_id BIGINT,
    p_asset VARCHAR,
    p_amount NUMERIC,
    p_reason TEXT

)

RETURNS VOID AS $$

DECLARE

    v_balance NUMERIC;

BEGIN

    SELECT balance
    INTO v_balance
    FROM wallet_balances
    WHERE user_id = p_user_id
    AND asset = p_asset
    FOR UPDATE;

    IF v_balance IS NULL THEN

        RAISE EXCEPTION
        'wallet_not_found';

    END IF;

    IF v_balance < p_amount THEN

        RAISE EXCEPTION
        'insufficient_balance';

    END IF;

    UPDATE wallet_balances

    SET balance = balance - p_amount,

        updated_at = NOW()

    WHERE user_id = p_user_id
    AND asset = p_asset;

    INSERT INTO wallet_transactions (

        user_id,
        asset,
        amount,
        type,
        reason,
        created_at

    )

    VALUES (

        p_user_id,
        p_asset,
        p_amount,
        'debit',
        p_reason,
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   WALLET LOCK
========================================================= */

CREATE OR REPLACE FUNCTION fn_wallet_lock(

    p_user_id BIGINT,
    p_asset VARCHAR,
    p_amount NUMERIC

)

RETURNS VOID AS $$

BEGIN

    UPDATE wallet_balances

    SET

        balance = balance - p_amount,

        locked = locked + p_amount,

        updated_at = NOW()

    WHERE user_id = p_user_id
    AND asset = p_asset
    AND balance >= p_amount;

    IF NOT FOUND THEN

        RAISE EXCEPTION
        'lock_failed';

    END IF;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   WALLET UNLOCK
========================================================= */

CREATE OR REPLACE FUNCTION fn_wallet_unlock(

    p_user_id BIGINT,
    p_asset VARCHAR,
    p_amount NUMERIC

)

RETURNS VOID AS $$

BEGIN

    UPDATE wallet_balances

    SET

        balance = balance + p_amount,

        locked = locked - p_amount,

        updated_at = NOW()

    WHERE user_id = p_user_id
    AND asset = p_asset
    AND locked >= p_amount;

    IF NOT FOUND THEN

        RAISE EXCEPTION
        'unlock_failed';

    END IF;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   PNL CALCULATION
========================================================= */

CREATE OR REPLACE FUNCTION fn_calculate_pnl(

    p_entry NUMERIC,
    p_mark NUMERIC,
    p_size NUMERIC,
    p_side VARCHAR

)

RETURNS NUMERIC AS $$

DECLARE

    pnl NUMERIC;

BEGIN

    IF p_side = 'long' THEN

        pnl :=
            (p_mark - p_entry)
            * p_size;

    ELSE

        pnl :=
            (p_entry - p_mark)
            * p_size;

    END IF;

    RETURN pnl;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   LIQUIDATION PRICE
========================================================= */

CREATE OR REPLACE FUNCTION fn_liquidation_price(

    p_entry NUMERIC,
    p_leverage NUMERIC,
    p_side VARCHAR

)

RETURNS NUMERIC AS $$

DECLARE

    liq NUMERIC;

BEGIN

    IF p_side = 'long' THEN

        liq :=
            p_entry -
            (p_entry / p_leverage);

    ELSE

        liq :=
            p_entry +
            (p_entry / p_leverage);

    END IF;

    RETURN liq;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   REFERRAL REWARD
========================================================= */

CREATE OR REPLACE FUNCTION fn_referral_reward(

    p_user_id BIGINT,
    p_amount NUMERIC

)

RETURNS VOID AS $$

DECLARE

    v_referrer BIGINT;

    v_reward NUMERIC;

BEGIN

    SELECT referred_by
    INTO v_referrer
    FROM users
    WHERE id = p_user_id;

    IF v_referrer IS NULL THEN

        RETURN;

    END IF;

    v_reward := p_amount * 0.01;

    INSERT INTO referrals (

        referrer_id,
        referred_id,
        reward,
        created_at

    )

    VALUES (

        v_referrer,
        p_user_id,
        v_reward,
        NOW()

    );

    PERFORM fn_wallet_credit(

        v_referrer,
        'BX',
        v_reward,
        'referral_reward'

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   ORDER EXECUTION
========================================================= */

CREATE OR REPLACE FUNCTION fn_execute_trade(

    p_maker BIGINT,
    p_taker BIGINT,
    p_pair VARCHAR,
    p_price NUMERIC,
    p_amount NUMERIC

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO trades (

        pair,
        maker_id,
        taker_id,
        side,
        price,
        amount,
        created_at

    )

    VALUES (

        p_pair,
        p_maker,
        p_taker,
        'buy',
        p_price,
        p_amount,
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

CREATE OR REPLACE FUNCTION fn_notify(

    p_user_id BIGINT,
    p_type VARCHAR,
    p_title TEXT,
    p_body TEXT

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO notifications (

        user_id,
        type,
        title,
        body,
        created_at

    )

    VALUES (

        p_user_id,
        p_type,
        p_title,
        p_body,
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   FRAUD SCORE
========================================================= */

CREATE OR REPLACE FUNCTION fn_fraud_score(

    p_amount NUMERIC

)

RETURNS NUMERIC AS $$

DECLARE

    score NUMERIC := 0;

BEGIN

    IF p_amount > 1000 THEN
        score := score + 20;
    END IF;

    IF p_amount > 10000 THEN
        score := score + 30;
    END IF;

    IF p_amount > 100000 THEN
        score := score + 50;
    END IF;

    RETURN score;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   CREATE AUDIT LOG
========================================================= */

CREATE OR REPLACE FUNCTION fn_audit(

    p_user_id BIGINT,
    p_action VARCHAR,
    p_meta JSONB

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO audit_logs (

        user_id,
        action,
        meta,
        created_at

    )

    VALUES (

        p_user_id,
        p_action,
        p_meta,
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   SYSTEM METRICS
========================================================= */

CREATE OR REPLACE FUNCTION fn_metric(

    p_metric VARCHAR,
    p_value NUMERIC

)

RETURNS VOID AS $$

BEGIN

    INSERT INTO system_metrics (

        metric,
        value,
        created_at

    )

    VALUES (

        p_metric,
        p_value,
        NOW()

    );

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   TREASURY BALANCE
========================================================= */

CREATE OR REPLACE FUNCTION fn_treasury_balance(

    p_asset VARCHAR

)

RETURNS NUMERIC AS $$

DECLARE

    total NUMERIC;

BEGIN

    SELECT COALESCE(
        SUM(balance),
        0
    )

    INTO total

    FROM treasury_wallets

    WHERE asset = p_asset;

    RETURN total;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   USER TOTAL BALANCE
========================================================= */

CREATE OR REPLACE FUNCTION fn_total_balance(

    p_user_id BIGINT

)

RETURNS NUMERIC AS $$

DECLARE

    total NUMERIC;

BEGIN

    SELECT COALESCE(
        SUM(balance + locked),
        0
    )

    INTO total

    FROM wallet_balances

    WHERE user_id = p_user_id;

    RETURN total;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   MARKET VOLUME
========================================================= */

CREATE OR REPLACE FUNCTION fn_market_volume(

    p_pair VARCHAR

)

RETURNS NUMERIC AS $$

DECLARE

    volume NUMERIC;

BEGIN

    SELECT COALESCE(
        SUM(amount),
        0
    )

    INTO volume

    FROM trades

    WHERE pair = p_pair
    AND created_at >
        NOW() - INTERVAL '24 HOURS';

    RETURN volume;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   OPEN INTEREST
========================================================= */

CREATE OR REPLACE FUNCTION fn_open_interest(

    p_pair VARCHAR

)

RETURNS NUMERIC AS $$

DECLARE

    oi NUMERIC;

BEGIN

    SELECT COALESCE(
        SUM(margin),
        0
    )

    INTO oi

    FROM positions

    WHERE pair = p_pair
    AND status = 'open';

    RETURN oi;

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   CLEAN OLD SESSIONS
========================================================= */

CREATE OR REPLACE FUNCTION fn_cleanup_sessions()
RETURNS VOID AS $$

BEGIN

    DELETE FROM user_sessions
    WHERE expires_at < NOW();

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   CLEAN WS SESSIONS
========================================================= */

CREATE OR REPLACE FUNCTION fn_cleanup_ws()
RETURNS VOID AS $$

BEGIN

    DELETE FROM websocket_sessions
    WHERE disconnected_at IS NOT NULL
    AND disconnected_at <
        NOW() - INTERVAL '1 day';

END;

$$ LANGUAGE plpgsql;

/* =========================================================
   HEARTBEAT
========================================================= */

CREATE OR REPLACE FUNCTION fn_cluster_heartbeat(

    p_node VARCHAR

)

RETURNS VOID AS $$

BEGIN

    UPDATE cluster_nodes

    SET heartbeat_at = NOW()

    WHERE node_name = p_node;

END;

$$ LANGUAGE plpgsql;
