function validate(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter((f) => !req.body?.[f]);
    if (missing.length) {
      return res.status(400).json({ ok: false, error: `Missing: ${missing.join(", ")}` });
    }
    next();
  };
}

module.exports = validate;