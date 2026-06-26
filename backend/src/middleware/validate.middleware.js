function validate(requiredFields) {
  return (req, res, next) => {
    const missingFields = requiredFields.filter((field) => {
      const value = req.body?.[field];

      return (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      );
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        ok: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    next();
  };
}

module.exports = validate;