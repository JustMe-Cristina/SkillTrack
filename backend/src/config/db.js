
require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"   //suport complet Unicode (emoji, diacritice)
});

// Verificare conexiune la pornirea serverului
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1); // opreşte serverul dacă DB nu e disponibil
  }
  console.log("✅ DB connected");
  connection.release();
});

module.exports = pool.promise();