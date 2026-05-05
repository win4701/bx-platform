"use strict";

module.exports = (db) => ({

  async findById(id){
    const r = await db.query(
      "SELECT * FROM users WHERE id=$1",
      [id]
    );
    return r.rows[0];
  },

  async findByEmail(email){
    const r = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );
    return r.rows[0];
  },

  async create(user){
    const r = await db.query(`
      INSERT INTO users(email,password)
      VALUES($1,$2)
      RETURNING *
    `,[user.email, user.password]);

    return r.rows[0];
  }

});
