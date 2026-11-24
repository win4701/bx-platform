'use strict';

/* BLOXIO EMAIL SERVICE — adds a dedicated email verification template. */
const nodemailer = require("nodemailer");
const { addJob } = require("../queues/systemQueue");
const config = require("../config");

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: Number(config.email.port) === 465,
  auth: { user: config.email.user, pass: config.email.pass }
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function renderTemplate(type, data = {}) {
  switch (type) {
    case "verification": {
      const url = escapeHtml(data.verificationUrl);
      return {
        subject: "Verify your BLOXIO email address",
        html: `<div style="font-family:Arial,sans-serif;background:#071a16;color:#f5f5f5;padding:32px;border-radius:16px">
          <h2 style="color:#d9b43b">Verify your email</h2>
          <p>Confirm your email address to secure your BLOXIO account.</p>
          <p><a href="${url}" style="display:inline-block;background:#d9b43b;color:#101610;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Verify email</a></p>
          <p>If the button does not work, open this link:</p><p style="word-break:break-all">${url}</p>
          <small>This link expires in 30 minutes and can only be used once. If you did not create this account, ignore this message.</small>
        </div>`
      };
    }
    case "welcome":
      return { subject: "Welcome to BLOXIO", html: `<h2>Welcome to BLOXIO</h2><p>Your account has been created.</p>` };
    case "deposit":
      return { subject: "Deposit Confirmed", html: `<h3>Deposit Successful</h3><p>Amount: ${escapeHtml(data.amount)}</p>` };
    case "withdraw":
      return { subject: "Withdraw Request", html: `<p>Your withdrawal of ${escapeHtml(data.amount)} is processing.</p>` };
    default:
      return { subject: "BLOXIO Notification", html: `<p>${escapeHtml(data.message)}</p>` };
  }
}
async function sendRaw({ to, subject, html }) {
  return transporter.sendMail({ from: config.email.user, to, subject, html });
}
async function send(type, to, data) {
  return addJob("email_send", { type, to, data });
}
async function process(job) {
  const { type, to, data } = job.data;
  const template = renderTemplate(type, data);
  await sendRaw({ to, subject: template.subject, html: template.html });
  console.log("[BLOXIO EMAIL] sent:", to, type);
}
module.exports = { send, process, renderTemplate };
