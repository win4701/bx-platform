const {createClient} = require("redis")

const pub = createClient({url:process.env.REDIS_URL})
const sub = createClient({url:process.env.REDIS_URL})

pub.connect()
sub.connect()

async function publish(channel,data){

await pub.publish(
channel,
JSON.stringify(data)
)

}

function subscribe(channel,handler){

sub.subscribe(channel,(msg)=>{
handler(JSON.parse(msg))
})

}

module.exports={publish,subscribe}
