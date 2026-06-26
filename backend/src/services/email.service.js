const nodemailer = require("nodemailer");

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5175";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail({ to, subject, title, buttonText, link }) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: `
        <div style="max-width:600px;margin:auto;padding:32px;font-family:Arial,sans-serif;color:#111827;">
          <h2 style="margin-bottom:16px;">${title}</h2>

          <p style="line-height:1.6;">
            Pentru a continua, apasă pe butonul de mai jos.
          </p>

          <a
            href="${link}"
            style="
              display:inline-block;
              margin:24px 0;
              padding:12px 22px;
              background:#111827;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              font-weight:bold;
            "
          >
            ${buttonText}
          </a>

          <p style="margin-top:24px;">
            Dacă butonul nu funcționează, copiază linkul de mai jos:
          </p>

          <p style="word-break:break-all;">
            ${link}
          </p>

          <hr style="margin:32px 0;">

          <p style="font-size:13px;color:#6b7280;">
            Acest mesaj a fost trimis automat de SkillTrack.
          </p>
        </div>
      `
    });

    console.log(`Email sent successfully to ${to}`);
  } catch (err) {
    console.error("EMAIL ERROR:", err);

    console.log("DEV LINK:");
    console.log(link);
  }
}

async function sendVerificationEmail({ email, token }) {
  await sendEmail({
    to: email,
    subject: "Confirmare cont SkillTrack",
    title: "Confirmă contul SkillTrack",
    buttonText: "Confirmă emailul",
    link: `${FRONTEND_URL}/verificare-email?token=${token}`
  });
}

async function sendResetPasswordEmail({ email, token }) {
  await sendEmail({
    to: email,
    subject: "Resetare parolă SkillTrack",
    title: "Resetare parolă",
    buttonText: "Resetează parola",
    link: `${FRONTEND_URL}/resetare-parola/${token}`
  });
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail
};