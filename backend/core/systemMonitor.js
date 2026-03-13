const os = require("os")

let requestCount = 0

function trackRequest(){
requestCount++
}

function getStats(){

const memory = process.memoryUsage()

return {

uptime:process.uptime(),

cpu_load:os.loadavg()[0],

total_memory:os.totalmem(),

free_memory:os.freemem(),

rss:memory.rss,

heap_used:memory.heapUsed,

heap_total:memory.heapTotal,

requests:requestCount,

time:Date.now()

}

}

module.exports={

trackRequest,
getStats

}
