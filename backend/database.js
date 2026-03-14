require("dotenv").config()

const {Pool} = require("pg")

const pool = new Pool({

connectionString:process.env.DATABASE_URL,

ssl:{
rejectUnauthorized:false
},

max:20,
idleTimeoutMillis:30000,
connectionTimeoutMillis:2000

})

async function query(text,params){

return pool.query(text,params)

}

async function transaction(callback){

const client = await pool.connect()

try{

await client.query("BEGIN")

const result = await callback(client)

await client.query("COMMIT")

return result

}catch(e){

await client.query("ROLLBACK")
throw e

}finally{

client.release()

}

}

module.exports = {

query,
transaction,
pool

}
