"use strict";

/* =========================================================
   BLOXIO EMAIL SYSTEM — ULTRA PRO
========================================================= */

const nodemailer = require("nodemailer");
const { addJob } = require("../core/systemQueue");
const config = require("../config");

/* =========================================================
   TRANSPORT
========================================================= */

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

/* =========================================================
   TEMPLATE ENGINE
========================================================= */

function renderTemplate(type, data){

  switch(type){

    case "welcome":
      return {
        subject: "Welcome to BLOXIO 🚀",
        html: `
          <h2>Welcome ${data.email}</h2>
          <p>Your account is ready.</p>
        `
      };

    case "deposit":
      return {
        subject: "Deposit Confirmed 💰",
        html: `
          <h3>Deposit Successful</h3>
          <p>Amount: ${data.amount}</p>
        `
      };

    case "withdraw":
      return {
        subject: "Withdraw Request",
        html: `
          <p>Your withdraw of ${data.amount} is processing</p>
        `
      };

    default:
      return {
        subject: "Notification",
        html: `<p>${data.message}</p>`
      };

  }

}

/* =========================================================
   DIRECT SEND (LOW LEVEL)
========================================================= */

async function sendRaw({ to, subject, html }){

  return await transporter.sendMail({
    from: config.email.user,
    to,
    subject,
    html
  });

}

/* =========================================================
   QUEUED SEND (🔥 مهم)
========================================================= */

async function send(type, to, data){

  return await addJob("email_send", {
    type,
    to,
    data
  });

}

/* =========================================================
   WORKER HANDLER
========================================================= */

async function process(job){

  const { type, to, data } = job.data;

  const tpl = renderTemplate(type, data);

  try{

    await sendRaw({
      to,
      subject: tpl.subject,
      html: tpl.html
    });

    console.log("📧 Email sent:", to);

  }catch(e){

    console.error("❌ Email failed:", e.message);
    throw e;

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  send,
  process
};
