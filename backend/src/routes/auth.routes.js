// src/routes/auth.routes.js
// Rol: definește rutele de autentificare (register + login) și emite JWT pentru acces la rutele protejate

const express = require("express");            // Importă framework-ul Express pentru routing și API
const bcrypt = require("bcrypt");              // Librărie pentru hashing de parole (securitate)
const jwt = require("jsonwebtoken");           // Librărie pentru generarea și verificarea JSON Web Tokens
const db = require("../config/db");            // Importă conexiunea la baza de date MySQL (pool)

const router = express.Router();               // Creează un router modular pentru rutele de auth

/**
 * POST /api/auth/register
 * body: { name, email, password }
 * Creează un utilizator nou în baza de date
 */
router.post("/register", async (req, res) => {  // Definește ruta POST /register (creare user)
  try {
    const { name, email, password } = req.body; // Extrage datele din request body (trimise de frontend)

    // Validare minimă: verifică dacă toate câmpurile există
    if (!name || !email || !password) {
      return res.status(400).json({              // 400 = Bad Request
        ok: false,
        error: "Missing fields"
      });
    }

    // Hash parola cu bcrypt pentru securitate
    const passwordHash = await bcrypt.hash(password, 10); 
    // 10 = saltRounds (numărul de iterări criptografice)

    // Inserează utilizatorul în baza de date
    await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]               // Parametrii pentru query (protejează de SQL injection)
    );

    // Trimite răspuns de succes
    return res.status(201).json({               // 201 = resource created
      ok: true,
      message: "User created"
    });

  } catch (err) {

    // Dacă emailul există deja (constraint UNIQUE în DB)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({             // 409 = conflict
        ok: false,
        error: "Email already in use"
      });
    }

    console.error(err);                         // Afișează eroarea în terminal (debug)

    return res.status(500).json({               // 500 = server error
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 * Autentifică utilizatorul și returnează un JWT token
 */
router.post("/login", async (req, res) => {      // Definește ruta POST /login
  try {
    const { email, password } = req.body;       // Extrage email și parolă din request

    // Validare minimă
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Missing fields"
      });
    }

    // Caută utilizatorul în baza de date după email
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    // Dacă nu există user cu acel email
    if (rows.length === 0) {
      return res.status(401).json({             // 401 = unauthorized
        ok: false,
        error: "Invalid credentials"
      });
    }

    const user = rows[0];                       // Extrage userul din rezultatul query-ului

    // Compară parola introdusă cu hash-ul stocat în DB
    const isValid = await bcrypt.compare(password, user.password_hash);

    // Dacă parola nu este corectă
    if (!isValid) {
      return res.status(401).json({
        ok: false,
        error: "Invalid credentials"
      });
    }

    // Creează token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },   // Payload-ul tokenului (datele incluse)
      process.env.JWT_SECRET,                   // Cheia secretă pentru semnarea tokenului
      { expiresIn: "2h" }                       // Tokenul expiră după 2 ore
    );

    // Trimite tokenul și datele userului către frontend
    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {

    console.error(err);                         // Log eroare în terminal

    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

module.exports = router;                        // Exportă routerul pentru a fi folosit în server.js