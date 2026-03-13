const clients = new Set()

function add(ws){
clients.add(ws)
}

function remove(ws){
clients.delete(ws)
}

function broadcast(data){

const msg = JSON.stringify(data)

clients.forEach(c=>{
if(c.readyState===1){
c.send(msg)
}
})

}

module.exports={
add,
remove,
broadcast
}
