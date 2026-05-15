"use strict";

/* =========================================================
   BLOXIO AUTH MIDDLEWARE
========================================================= */

const jwt =
  require("jsonwebtoken");

/* =========================================================
   AUTH
========================================================= */

module.exports = async function(
  req,
  res,
  next
){

  try{

    const header =

      req.headers.authorization ||

      req.headers.Authorization ||

      "";

    const token =

      header.startsWith("Bearer ")

        ? header.slice(7)

        : null;

    if(!token){

      return res.status(401).json({

        success:false,

        error:"unauthorized"

      });

    }

    const decoded =
      jwt.verify(

        token,

        process.env.JWT_SECRET

      );

    req.user = {

      id:
        decoded.id,

      email:
        decoded.email ||

        null

    };

    next();

  }catch(err){

    console.error(

      "AUTH:",

      err.message

    );

    return res.status(401).json({

      success:false,

      error:"invalid_token"

    });

  }

};
