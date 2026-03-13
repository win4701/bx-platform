function adminAuth(req,res,next){

if(!req.user)
return res.status(401).json({error:"no_auth"})

if(!req.user.is_admin)
return res.status(403).json({error:"not_admin"})

next()

}

module.exports = adminAuth
