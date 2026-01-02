import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const bot = new TelegramBot(process.env.BOT_TOKEN,{polling:true});

bot.onText(/\/start/,msg=>{
  bot.sendMessage(msg.chat.id,"Welcome to Bloxio BX",{
    reply_markup:{
      inline_keyboard:[[
        {text:"🚀 Open App",web_app:{url:process.env.APP_URL}}
      ]]
    }
  });
});

app.use("/app",express.static(path.join(__dirname,"../app")));
app.get("/",(_,res)=>res.send("OK"));

app.listen(process.env.PORT||3000);
