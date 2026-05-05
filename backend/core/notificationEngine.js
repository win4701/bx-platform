"use strict";

class NotificationEngine{

  send(userId, message){

    global.WS.send(userId,{
      type:"notification",
      message
    });

  }

}

module.exports = new NotificationEngine();
