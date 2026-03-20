const MAX_LEVEL = 3;

async function processAffiliate(userId, amount, type){

  let current = userId;
  let level = 1;

  while(level <= MAX_LEVEL){

    const res = await db.query(
      "SELECT referred_by FROM users WHERE id=$1",
      [current]
    );

    const parent = res.rows[0]?.referred_by;
    if(!parent) break;

    const percent = getLevelPercent(level);

    const vipBoost = await getVIPBoost(parent);

    const reward = amount * percent * vipBoost;

    if(reward > 0){

      await db.query(
        "UPDATE users SET bx_balance = bx_balance + $1 WHERE id=$2",
        [reward, parent]
      );

      await db.query(
        "INSERT INTO affiliate_commissions(from_user,to_user,level,amount,type) VALUES($1,$2,$3,$4,$5)",
        [userId, parent, level, reward, type]
      );

    }

    current = parent;
    level++;

  }

}

/* ================= LEVEL % ================= */

function getLevelPercent(level){
  if(level === 1) return 0.05;
  if(level === 2) return 0.02;
  if(level === 3) return 0.01;
  return 0;
}

/* ================= VIP BOOST ================= */

async function getVIPBoost(userId){

  const r = await db.query(
    "SELECT total_volume FROM users WHERE id=$1",
    [userId]
  );

  const volume = r.rows[0]?.total_volume || 0;

  const vip = await db.query(
    "SELECT boost FROM vip_levels WHERE min_volume <= $1 ORDER BY min_volume DESC LIMIT 1",
    [volume]
  );

  return vip.rows[0]?.boost || 1;
}

module.exports = { processAffiliate };
