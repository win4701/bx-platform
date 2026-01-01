// src/routes/leaderboard.js
r.get("/:game", async (req,res)=>{
  const g = req.params.game;
  const q = await pool.query(
    `SELECT user_id, SUM(payout_bx) win
     FROM game_bets WHERE game=$1
     GROUP BY user_id ORDER BY win DESC LIMIT 20`,[g]
  );
  res.json(q.rows);
});
