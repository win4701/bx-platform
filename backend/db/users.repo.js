"use strict";

/* =========================================================
   BLOXIO USERS REPO — ULTRA PRO
========================================================= */

module.exports = (db, redis = null) => ({

  /* =========================================================
     HELPERS
  ========================================================= */

  sanitize(user){
    if(!user) return null;
    delete user.password;
    return user;
  },

  /* =========================================================
     FIND BY ID (WITH CACHE)
  ========================================================= */

  async findById(id){

    if(!id) return null;

    const cacheKey = `user:${id}`;

    if(redis){
      const cached = await redis.getCache(cacheKey);
      if(cached) return cached;
    }

    const r = await db.query(`
      SELECT id,email,role,banned,frozen,created_at
      FROM users
      WHERE id=$1
    `,[id]);

    const user = r.rows[0] || null;

    if(user && redis){
      await redis.setCache(cacheKey, user, 60);
    }

    return user;

  },

  /* =========================================================
     FIND BY EMAIL (AUTH SAFE)
  ========================================================= */

  async findByEmail(email){

    if(!email) return null;

    const r = await db.query(`
      SELECT *
      FROM users
      WHERE email=$1
    `,[email]);

    return r.rows[0] || null; // includes password (auth only)

  },

  /* =========================================================
     CREATE USER (SAFE)
  ========================================================= */

  async create(user){

    if(!user.email || !user.password){
      throw new Error("invalid_user_data");
    }

    try{

      const r = await db.query(`
        INSERT INTO users(email,password,role)
        VALUES($1,$2,'user')
        RETURNING id,email,role,created_at
      `,[user.email, user.password]);

      return r.rows[0];

    }catch(e){

      if(e.code === "23505"){
        throw new Error("email_exists");
      }

      throw e;
    }

  },

  /* =========================================================
     UPDATE USER
  ========================================================= */

  async update(id, data){

    if(!id) throw new Error("invalid_id");

    const fields = [];
    const values = [];
    let i = 1;

    for(const k in data){
      fields.push(`${k}=$${i++}`);
      values.push(data[k]);
    }

    if(!fields.length) return null;

    values.push(id);

    const r = await db.query(`
      UPDATE users
      SET ${fields.join(",")}
      WHERE id=$${i}
      RETURNING id,email,role,banned,frozen
    `,values);

    return r.rows[0];

  },

  /* =========================================================
     LOCK USER (FOR UPDATE)
  ========================================================= */

  async lock(id, tx){

    const client = tx || db;

    const r = await client.query(`
      SELECT *
      FROM users
      WHERE id=$1
      FOR UPDATE
    `,[id]);

    return r.rows[0];

  },

  /* =========================================================
     PAGINATION (ADMIN)
  ========================================================= */

  async list({ limit=50, offset=0 }){

    const r = await db.query(`
      SELECT id,email,role,banned,frozen,created_at
      FROM users
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `,[limit,offset]);

    return r.rows;

  },

  /* =========================================================
     SOFT DELETE
  ========================================================= */

  async softDelete(id){

    await db.query(`
      UPDATE users
      SET deleted=true
      WHERE id=$1
    `,[id]);

  },

  /* =========================================================
     BAN / FREEZE
  ========================================================= */

  async ban(id){
    await db.query(`
      UPDATE users SET banned=true WHERE id=$1
    `,[id]);
  },

  async freeze(id){
    await db.query(`
      UPDATE users SET frozen=true WHERE id=$1
    `,[id]);
  },

  /* =========================================================
     AUDIT (OPTIONAL)
  ========================================================= */

  async log(id, action){

    await db.query(`
      INSERT INTO audit_logs(user_id,action)
      VALUES($1,$2)
    `,[id,action]);

  }

});
