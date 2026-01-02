CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  bx_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id BIGINT,
  amount NUMERIC,
  status TEXT
);
