const jwt = require("jsonwebtoken")

function generateToken(user){

return jwt.sign(

{
id:user.id,
is_admin:user.is_admin
},

process.env.JWT_SECRET,

{expiresIn:"7d"}

)

}

function auth(req,res,next){

const header = req.headers.authorization

if(!header)
return res.status(401).json({error:"no_token"})

try{

const token = header.split(" ")[1]

const decoded = jwt.verify(

token,
process.env.JWT_SECRET

)

req.user = decoded

next()

}catch{

res.status(401).json({error:"invalid_token"})

}

}

function adminAuth(req,res,next){

if(!req.user?.is_admin)
return res.status(403).json({error:"not_admin"})

next()

}

module.exports = {

generateToken,
auth,
adminAuth

}
