const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         id,
         name,
         category,
         weight
       FROM skills
       ORDER BY category ASC, name ASC`
    );

    return res.json({
      ok: true,
      skills: rows
    });
  } catch (err) {
    console.error("GET SKILLS ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

module.exports = router;