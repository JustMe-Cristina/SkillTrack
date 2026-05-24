const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      error: "Token lipsă"
    });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      userId: payload.userId,
      email: payload.email
    };

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: "Token invalid sau expirat"
    });
  }
}

module.exports = auth;