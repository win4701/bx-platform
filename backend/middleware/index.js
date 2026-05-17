"use strict";

/* =========================================================
   BLOXIO MIDDLEWARE SYSTEM — ALL IN ONE
========================================================= */

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const config = require("./config");

/* =========================================================
   SECURITY HEADERS
========================================================= */

function security(app){

  app.use(helmet());

  app.use((req,res,next)=>{

    req.realIP =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    /* basic anti-bot */
    if(!req.headers["user-agent"]){
      return res.status(403).send("blocked");
    }

    next();
  });

}

/* =========================================================
   RATE LIMITERS
========================================================= */

const rate = {

  global: rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.max
  }),

  auth: rateLimit({
    windowMs: 60 * 1000,
    max: 10
  }),

  withdraw: rateLimit({
    windowMs: 60 * 1000,
    max: 3
  })

};

/* =========================================================
   AUTH JWT
========================================================= */

function auth(req,res,next){

  try{

    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
      return res.status(401).json({error:"no_token"});
    }

    const decoded = jwt.verify(
      token,
      config.security.jwtSecret
    );

    req.user = decoded;

    next();

  }catch(e){

    return res.status(401).json({
      error:"unauthorized"
    });

  }

}

/* =========================================================
   OPTIONAL AUTH (بدون إجبار)
========================================================= */

function optionalAuth(req,res,next){

  try{

    const token = req.headers.authorization?.split(" ")[1];

    if(token){
      req.user = jwt.verify(token, config.security.jwtSecret);
    }

  }catch{}

  next();

}

/* =========================================================
   ADMIN GUARD
========================================================= */

function admin(req,res,next){

  if(!req.user || req.user.role !== "admin"){
    return res.status(403).json({error:"forbidden"});
  }

  next();

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  security,
  rate,
  auth,
  optionalAuth,
  admin
};
