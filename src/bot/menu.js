// src/bot/menu.js
export function mainMenu(bot, chatId){
  bot.sendMessage(chatId,"Choose:",{
    reply_markup:{
      inline_keyboard:[
        [{text:"🎁 Airdrop", callback_data:"airdrop"}],
        [{text:"💱 Buy BX", callback_data:"buy"}]
      ]
    }
  });
}
