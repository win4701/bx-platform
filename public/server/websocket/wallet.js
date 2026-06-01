/* =========================================================
   FILE: server/websocket/wallet.js
========================================================= */

module.exports=function(io){

io.on(
"connection",
socket=>{

socket.on(
"wallet:subscribe",
userId=>{

socket.join(
`wallet:${userId}`
);

}
);

socket.on(
"wallet:refresh",
payload=>{

io.to(
`wallet:${payload.userId}`
).emit(
"wallet:update",
payload
);

}
);

});

};
