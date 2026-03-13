const monitor = require("../core/systemMonitor")

exports.health = (req,res)=>{

res.json({

status:"ok",
time:Date.now()

})

}

exports.stats = (req,res)=>{

res.json(
monitor.getStats()
)

}
