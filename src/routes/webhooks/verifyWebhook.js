import { pool } from "../db/pg.js";

// داخل كل return 403 أو success
await pool.query(
  `INSERT INTO webhook_logs(provider, ip, status, reason)
   VALUES($1,$2,$3,$4)`,
  [req.path.split("/")[1], req.ip, 403, "invalid_signature"]
);
