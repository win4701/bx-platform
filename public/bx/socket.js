window.BXSocket=
io(
window.location.origin,
{
transports:[
"websocket"
]
}
);

BXSocket.on(
"connected",
data=>{

console.log(
data
);

}
); 
