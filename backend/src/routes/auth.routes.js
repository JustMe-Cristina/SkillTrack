const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const db = require("../config/db");
const auth = require("../middleware/auth.middleware");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../services/email.service");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function createRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function addHours(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

function isValidEmail(email) {
  return String(email || "").includes("@");
}

function isValidPassword(password) {
  return String(password || "").length >= 8;
}

function createJwtToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Missing fields",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid email",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        ok: false,
        error: "Password must have at least 8 characters",
      });
    }

    const [existingUsers] = await db.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        ok: false,
        error: "Email already in use",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = createRandomToken();
    const verificationExpires = addHours(24);

    await db.query(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        email_verified,
        email_verification_token,
        email_verification_expires,
        password_reset_token,
        password_reset_expires
      )
      VALUES (?, ?, ?, 0, ?, ?, NULL, NULL)
      `,
      [name, email, passwordHash, verificationToken, verificationExpires],
    );

    await sendVerificationEmail({
      email,
      token: verificationToken,
    });

    return res.status(201).json({
      ok: true,
      message:
        "Cont creat. Verifică emailul pentru activare. Dacă SMTP nu este configurat, linkul apare în terminal.",
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

/* VERIFY EMAIL */
router.get("/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: "Missing token",
      });
    }

    const [users] = await db.query(
      `
      SELECT id, email_verified, email_verification_expires
      FROM users
      WHERE email_verification_token = ?
      LIMIT 1
      `,
      [token],
    );

    if (users.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid token",
      });
    }

    const user = users[0];

    if (Number(user.email_verified) === 1) {
      return res.json({
        ok: true,
        message: "Email already verified",
      });
    }

    const expiresAt = new Date(user.email_verification_expires);
    const now = new Date();

    if (expiresAt < now) {
      return res.status(400).json({
        ok: false,
        error: "Token expired",
      });
    }

    await db.query(
      `
      UPDATE users
      SET
        email_verified = 1,
        email_verification_token = NULL,
        email_verification_expires = NULL
      WHERE id = ?
      `,
      [user.id],
    );

    return res.json({
      ok: true,
      message: "Email verified",
    });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Missing fields",
      });
    }

    const [users] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        email_verified
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({
        ok: false,
        error: "Invalid credentials",
      });
    }

    const user = users[0];

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({
        ok: false,
        error: "Invalid credentials",
      });
    }

    if (Number(user.email_verified) !== 1) {
      return res.status(403).json({
        ok: false,
        error: "Email not verified",
      });
    }

    const token = createJwtToken(user);

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

/* ME */
router.get("/me", auth, async (req, res) => {
  try {
    const [users] = await db.query(
      `
      SELECT id, name, email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [req.user.userId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    return res.json({
      ok: true,
      user: users[0],
    });
  } catch (err) {
    console.error("ME ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

/* FORGOT PASSWORD */
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Email is required",
      });
    }

    const [users] = await db.query(
      `
      SELECT id, email
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email],
    );

    if (users.length === 0) {
      return res.json({
        ok: true,
        message: "Dacă emailul există, vei primi un link de resetare.",
      });
    }

    const resetToken = createRandomToken();
    const resetExpires = addHours(1);

    await db.query(
      `
      UPDATE users
      SET
        password_reset_token = ?,
        password_reset_expires = ?
      WHERE id = ?
      `,
      [resetToken, resetExpires, users[0].id],
    );

    await sendResetPasswordEmail({
      email,
      token: resetToken,
    });

    return res.json({
  ok: true,
  message: "Dacă emailul există, vei primi un link de resetare.",
});
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

/* RESET PASSWORD */
router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!token || !newPassword) {
      return res.status(400).json({
        ok: false,
        error: "Token and new password are required",
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        ok: false,
        error: "Password must have at least 8 characters",
      });
    }

    const [users] = await db.query(
      `
      SELECT id
      FROM users
      WHERE password_reset_token = ?
        AND password_reset_expires > NOW()
      LIMIT 1
      `,
      [token],
    );

    if (users.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid or expired reset token",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.query(
      `
      UPDATE users
      SET
        password_hash = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL
      WHERE id = ?
      `,
      [passwordHash, users[0].id],
    );

    return res.json({
      ok: true,
      message: "Parola a fost resetată cu succes.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

module.exports = router;
