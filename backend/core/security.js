const jwt = require("jsonwebtoken")

function generateToken(userId){

return jwt.sign(

{id:userId},
process.env.JWT_SECRET,
{expiresIn:"7d"}

)

}

function verifyToken(token){

return jwt.verify(token,process.env.JWT_SECRET)

}

function auth(req,res,next){

const h = req.headers.authorization

if(!h) return res.status(401).json({error:"no token"})

try{

const token = h.split(" ")[1]

req.user = verifyToken(token)

next()

}catch{

res.status(401).json({error:"invalid token"})

}

}

module.exports = {

generateToken,
verifyToken,
auth

}
