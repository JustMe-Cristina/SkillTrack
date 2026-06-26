const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      error: "Token lipsă",
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch {
    return res.status(401).json({
      ok: false,
      error: "Token invalid sau expirat",
    });
  }
}

module.exports = auth;