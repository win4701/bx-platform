const express = require("express");
const router = express.Router();

module.exports = (engine)=>{

  router.post("/order", async (req,res)=>{

    try{

      const { side, price, amount } = req.body;

      const order = await engine.create({
        userId: req.user.id,
        side,
        price,
        amount
      });

      res.json(order);

    }catch(e){
      res.status(400).json({error:e.message});
    }

  });

  return router;

};
