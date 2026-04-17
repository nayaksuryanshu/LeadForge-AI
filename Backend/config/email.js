const nodemailer = require("nodemailer");

let cachedTransportPromise = null;

const getDefaultFromAddress = () => {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    "LeadForge AI <no-reply@leadforge.ai>"
  );
};

const buildTransport = async () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendKey = process.env.RESEND_API_KEY;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  if (resendKey) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 587,
      secure: false,
      auth: {
        user: "resend",
        pass: resendKey,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const getEmailTransport = async () => {
  if (!cachedTransportPromise) {
    cachedTransportPromise = buildTransport();
  }

  return cachedTransportPromise;
};

module.exports = {
  getEmailTransport,
  getDefaultFromAddress,
};
