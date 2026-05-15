"use strict";

/* =========================================================
   BLOXIO AI ENGINE
========================================================= */

/* =========================================================
   CONFIG
========================================================= */

const ENABLE_AI =

  process.env.ENABLE_AI === "true";

/* =========================================================
   ANALYZE
========================================================= */

async function analyze({

  type = "",

  userId = null,

  payload = {}

}){

  try{

    if(!ENABLE_AI){

      return {

        enabled:false,

        safe:true,

        score:0,

        action:"allow",

        reasons:[]

      };

    }

    let score = 0;

    const reasons = [];

    /* ===== PAYLOAD SIZE ===== */

    const size =
      JSON.stringify(payload)
      .length;

    if(size > 50000){

      score += 30;

      reasons.push(
        "large_payload"
      );

    }

    /* ===== UNKNOWN TYPE ===== */

    if(!type){

      score += 10;

      reasons.push(
        "missing_type"
      );

    }

    /* ===== USER ===== */

    if(!userId){

      score += 20;

      reasons.push(
        "missing_user"
      );

    }

    /* ===== DECISION ===== */

    let action =
      "allow";

    if(score >= 70){

      action =
        "block";

    }else if(score >= 40){

      action =
        "review";

    }

    return {

      enabled:true,

      safe:
        action !== "block",

      score,

      action,

      reasons

    };

  }catch(err){

    console.error(

      "AI ENGINE:",

      err.message

    );

    return {

      enabled:false,

      safe:true,

      score:0,

      action:"allow",

      reasons:["fallback"]

    };

  }

}

/* =========================================================
   MODERATION
========================================================= */

async function moderate(
  text = ""
){

  try{

    if(!ENABLE_AI){

      return {

        blocked:false,

        score:0

      };

    }

    let score = 0;

    const lower =
      String(text)
      .toLowerCase();

    const banned = [

      "hack",

      "exploit",

      "scam",

      "fraud",

      "attack"

    ];

    for(const word of banned){

      if(
        lower.includes(word)
      ){

        score += 25;

      }

    }

    return {

      blocked:
        score >= 50,

      score

    };

  }catch{

    return {

      blocked:false,

      score:0

    };

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  analyze,

  moderate

};
