/* =========================================================
   FILE: server/websocket/system.js
========================================================= */

module.exports=function(io){

io.on(
"connection",
socket=>{

socket.emit(
"system:connected",
{
socketId:socket.id,
time:Date.now()
}
);

socket.on(
"ping",
()=>{
socket.emit(
"pong",
{
time:Date.now()
}
);
}
);

});

};
