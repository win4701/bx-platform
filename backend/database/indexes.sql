/* =========================================================
   BXS ENTERPRISE INDEXES
========================================================= */

/* =========================================================
   USERS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_referral
ON users(referral_code);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_created
ON users(created_at);

/* =========================================================
   USER SESSIONS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_token
ON user_sessions(token_hash);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry
ON user_sessions(expires_at);

/* =========================================================
   WALLETS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_wallets_user
ON wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_wallets_asset
ON wallets(asset);

CREATE INDEX IF NOT EXISTS idx_wallets_address
ON wallets(deposit_address);

/* =========================================================
   WALLET BALANCES
========================================================= */

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_balances_unique
ON wallet_balances(user_id, asset);

CREATE INDEX IF NOT EXISTS idx_wallet_balances_asset
ON wallet_balances(asset);

CREATE INDEX IF NOT EXISTS idx_wallet_balances_updated
ON wallet_balances(updated_at);

/* =========================================================
   WALLET TRANSACTIONS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user
ON wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_asset
ON wallet_transactions(asset);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_type
ON wallet_transactions(type);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_created
ON wallet_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_txid
ON wallet_transactions(tx_id);

/* =========================================================
   PAYMENTS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_payments_user
ON payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_external
ON payments(external_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_created
ON payments(created_at DESC);

/* =========================================================
   WITHDRAW REQUESTS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_withdraw_user
ON withdraw_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_withdraw_status
ON withdraw_requests(status);

CREATE INDEX IF NOT EXISTS idx_withdraw_asset
ON withdraw_requests(asset);

CREATE INDEX IF NOT EXISTS idx_withdraw_created
ON withdraw_requests(created_at DESC);

/* =========================================================
   ORDERS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_orders_pair
ON orders(pair);

CREATE INDEX IF NOT EXISTS idx_orders_side
ON orders(side);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_user
ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_pair_side_price
ON orders(pair, side, price);

CREATE INDEX IF NOT EXISTS idx_orders_matching
ON orders(pair, side, status, price, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_open
ON orders(status)
WHERE status='open';

/* =========================================================
   TRADES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_trades_pair
ON trades(pair);

CREATE INDEX IF NOT EXISTS idx_trades_created
ON trades(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_pair_created
ON trades(pair, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_maker
ON trades(maker_id);

CREATE INDEX IF NOT EXISTS idx_trades_taker
ON trades(taker_id);

/* =========================================================
   CANDLES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_candles_pair
ON candles(pair);

CREATE INDEX IF NOT EXISTS idx_candles_tf
ON candles(timeframe);

CREATE INDEX IF NOT EXISTS idx_candles_pair_tf_ts
ON candles(pair, timeframe, ts DESC);

/* =========================================================
   CASINO
========================================================= */

CREATE INDEX IF NOT EXISTS idx_casino_user
ON casino_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_casino_game
ON casino_sessions(game);

CREATE INDEX IF NOT EXISTS idx_casino_created
ON casino_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_casino_nonce
ON casino_sessions(nonce);

/* =========================================================
   MINING
========================================================= */

CREATE INDEX IF NOT EXISTS idx_mining_user
ON mining_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_mining_created
ON mining_sessions(created_at DESC);

/* =========================================================
   AIRDROP
========================================================= */

CREATE INDEX IF NOT EXISTS idx_airdrops_user
ON airdrops(user_id);

CREATE INDEX IF NOT EXISTS idx_airdrops_claimed
ON airdrops(claimed);

/* =========================================================
   REFERRALS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
ON referrals(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referred
ON referrals(referred_id);

/* =========================================================
   AUDIT LOGS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_audit_user
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_created
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_request
ON audit_logs(request_id);

/* =========================================================
   API KEYS
========================================================= */

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key
ON api_keys(api_key);

CREATE INDEX IF NOT EXISTS idx_api_keys_user
ON api_keys(user_id);

/* =========================================================
   NOTIFICATIONS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read
ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_notifications_created
ON notifications(created_at DESC);

/* =========================================================
   POSITIONS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_positions_user
ON positions(user_id);

CREATE INDEX IF NOT EXISTS idx_positions_pair
ON positions(pair);

CREATE INDEX IF NOT EXISTS idx_positions_status
ON positions(status);

/* =========================================================
   LIQUIDATIONS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_liquidations_user
ON liquidations(user_id);

CREATE INDEX IF NOT EXISTS idx_liquidations_pair
ON liquidations(pair);

CREATE INDEX IF NOT EXISTS idx_liquidations_created
ON liquidations(created_at DESC);

/* =========================================================
   PNL HISTORY
========================================================= */

CREATE INDEX IF NOT EXISTS idx_pnl_user
ON pnl_history(user_id);

CREATE INDEX IF NOT EXISTS idx_pnl_pair
ON pnl_history(pair);

CREATE INDEX IF NOT EXISTS idx_pnl_created
ON pnl_history(created_at DESC);

/* =========================================================
   WEBSOCKET SESSIONS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_ws_user
ON websocket_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_ws_socket
ON websocket_sessions(socket_id);

/* =========================================================
   MATCHING EVENTS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_matching_pair
ON matching_events(pair);

CREATE INDEX IF NOT EXISTS idx_matching_sequence
ON matching_events(sequence);

CREATE INDEX IF NOT EXISTS idx_matching_created
ON matching_events(created_at DESC);

/* =========================================================
   TREASURY
========================================================= */

CREATE INDEX IF NOT EXISTS idx_treasury_asset
ON treasury_wallets(asset);

CREATE INDEX IF NOT EXISTS idx_treasury_type
ON treasury_wallets(wallet_type);

/* =========================================================
   SYSTEM JOBS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_jobs_queue
ON system_jobs(queue);

CREATE INDEX IF NOT EXISTS idx_jobs_status
ON system_jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_created
ON system_jobs(created_at DESC);

/* =========================================================
   FRAUD EVENTS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_fraud_user
ON fraud_events(user_id);

CREATE INDEX IF NOT EXISTS idx_fraud_score
ON fraud_events(risk_score);

CREATE INDEX IF NOT EXISTS idx_fraud_created
ON fraud_events(created_at DESC);

/* =========================================================
   CLUSTER NODES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_cluster_status
ON cluster_nodes(status);

CREATE INDEX IF NOT EXISTS idx_cluster_heartbeat
ON cluster_nodes(heartbeat_at DESC);

/* =========================================================
   BLOCKCHAIN EVENTS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_blockchain_chain
ON blockchain_events(chain);

CREATE INDEX IF NOT EXISTS idx_blockchain_block
ON blockchain_events(block_number);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx
ON blockchain_events(tx_hash);

CREATE INDEX IF NOT EXISTS idx_blockchain_created
ON blockchain_events(indexed_at DESC);

/* =========================================================
   SYSTEM METRICS
========================================================= */

CREATE INDEX IF NOT EXISTS idx_metrics_name
ON system_metrics(metric);

CREATE INDEX IF NOT EXISTS idx_metrics_created
ON system_metrics(created_at DESC);

/* =========================================================
   JSONB GIN INDEXES
========================================================= */

CREATE INDEX IF NOT EXISTS idx_wallet_tx_meta
ON wallet_transactions
USING GIN(meta);

CREATE INDEX IF NOT EXISTS idx_payments_meta
ON payments
USING GIN(meta);

CREATE INDEX IF NOT EXISTS idx_audit_meta
ON audit_logs
USING GIN(meta);

CREATE INDEX IF NOT EXISTS idx_matching_payload
ON matching_events
USING GIN(payload);

CREATE INDEX IF NOT EXISTS idx_blockchain_payload
ON blockchain_events
USING GIN(payload);

/* =========================================================
   FULLTEXT SEARCH
========================================================= */

CREATE INDEX IF NOT EXISTS idx_notifications_search
ON notifications
USING GIN(to_tsvector('english', title || ' ' || body));

/* =========================================================
   PERFORMANCE HELPERS
========================================================= */

ANALYZE;

VACUUM ANALYZE;
