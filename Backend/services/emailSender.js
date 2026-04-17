const nodemailer = require("nodemailer");
const { getEmailTransport, getDefaultFromAddress } = require("../config/email");

const sendCampaignEmail = async ({ to, subject, body }) => {
  const transporter = await getEmailTransport();
  const from = getDefaultFromAddress();
  const text = String(body || "");
  const html = text.replace(/\n/g, "<br />");

  const info = await transporter.sendMail({
    from,
    replyTo: from,
    to,
    subject,
    text,
    html,
    headers: {
      "X-Mailer": "LeadForge AI",
    },
  });

  return {
    ...info,
    previewUrl: typeof info?.messageId === 'string' ? nodemailer.getTestMessageUrl(info) : '',
  };
};

module.exports = {
  sendCampaignEmail,
};
