const nodemailer = require("nodemailer");

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5175";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail({ email, token }) {
  const verificationLink =
    `${FRONTEND_URL}/verificare-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Confirmare cont SkillTrack",
      html: `
        <div style="font-family:Arial;padding:24px;">
          <h2>Confirmă contul SkillTrack</h2>

          <p>Apasă pe butonul de mai jos pentru activarea contului.</p>

          <a
            href="${verificationLink}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#111827;
              color:white;
              border-radius:10px;
              text-decoration:none;
              font-weight:bold;
            "
          >
            Confirmă emailul
          </a>

          <p style="margin-top:20px;">
            Sau folosește linkul:
          </p>

          <p>${verificationLink}</p>
        </div>
      `,
    });

    console.log("✅ Verification email sent:", email);
  } catch (err) {
    console.error("EMAIL ERROR:", err);

    console.log("DEV VERIFICATION LINK:");
    console.log(verificationLink);
  }
}

async function sendResetPasswordEmail({ email, token }) {
  const resetLink =
    `${FRONTEND_URL}/resetare-parola/${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Resetare parolă SkillTrack",
      html: `
        <div style="font-family:Arial;padding:24px;">
          <h2>Resetare parolă</h2>

          <p>Apasă pe butonul de mai jos pentru resetarea parolei.</p>

          <a
            href="${resetLink}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#111827;
              color:white;
              border-radius:10px;
              text-decoration:none;
              font-weight:bold;
            "
          >
            Resetează parola
          </a>

          <p style="margin-top:20px;">
            Sau folosește linkul:
          </p>

          <p>${resetLink}</p>
        </div>
      `,
    });

    console.log("✅ Reset password email sent:", email);
  } catch (err) {
    console.error("RESET EMAIL ERROR:", err);

    console.log("DEV RESET LINK:");
    console.log(resetLink);
  }
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};