require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'your_random_secret_here'; // From .env

// MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'rsvp2025',   // ← YOUR NEW PASSWORD
  database: 'rsvp_db'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected');
});

// ---------- RSVP (WITH DUPLICATE CHECK) ----------
app.post('/api/rsvp', async (req, res) => {
  const {
    first_name, last_name, response,
    guest1, guest2, guest3, guest4, note
  } = req.body;

  // Trim and normalize names
  const first = first_name?.trim();
  const last = last_name?.trim();

  if (!first || !last) {
    return res.status(400).json({ error: 'First and last name required' });
  }

  // CHECK FOR DUPLICATE
  const checkSql = `SELECT id FROM responses WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)`;
  db.query(checkSql, [first, last], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      return res.status(409).json({ 
        error: 'Duplicate RSVP', 
        message: `${first} ${last} has already submitted an RSVP.` 
      });
    }

    // INSERT NEW RSVP
    const insertSql = `INSERT INTO responses 
      (first_name, last_name, response, guest1, guest2, guest3, guest4, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(insertSql, [
      first, last, response,
      guest1?.trim() || null,
      guest2?.trim() || null,
      guest3?.trim() || null,
      guest4?.trim() || null,
      note?.trim() || null
    ], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    });
  });
});

// ---------- EXPORT CSV ----------
app.get('/api/export-csv', (req, res) => {
  const sql = `SELECT * FROM responses ORDER BY created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const fields = [
      'id', 'first_name', 'last_name', 'response',
      'guest1', 'guest2', 'guest3', 'guest4', 'note', 'created_at'
    ];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(results);

    const filePath = path.join(__dirname, 'rsvps.csv');
    fs.writeFileSync(filePath, csv);

    res.download(filePath, 'rsvps.csv');
  });
});

// ---------- ADMIN LOGIN ----------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM admin WHERE username = ?';
  db.query(sql, [username], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '2h' });
    res.json({ token });
  });
});

// ---------- JWT MIDDLEWARE ----------
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// ---------- ADMIN STATS ----------
app.get('/api/admin/stats', authenticate, (req, res) => {
  const sql = `
    SELECT 
      response,
      COUNT(*) as count,
      SUM(CASE WHEN response = 'yes' THEN 1 ELSE 0 END) as yes_count,
      SUM(CASE WHEN response = 'yes' THEN 
        (CASE WHEN guest1 IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN guest2 IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN guest3 IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN guest4 IS NOT NULL THEN 1 ELSE 0 END)
      ELSE 0 END) as guest_count
    FROM responses
    GROUP BY response;
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const stats = { yes: 0, no: 0, maybe: 0, guests: 0 };
    results.forEach(r => {
      if (r.response === 'yes') {
        stats.yes = Number(r.count);
        stats.guests = Number(r.guest_count);
      } else if (r.response === 'no') stats.no = Number(r.count);
      else if (r.response === 'maybe') stats.maybe = Number(r.count);
    });

    stats.totalAttending = stats.yes + stats.guests;
    res.json(stats);
  });
});

// ---------- GET ALL RESPONSES (for dashboard list) ----------
app.get('/api/admin/responses', authenticate, (req, res) => {
  const sql = `SELECT * FROM responses ORDER BY created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ---------- UPDATE RESPONSE ----------
app.put('/api/admin/responses/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, response, guest1, guest2, guest3, guest4, note } = req.body;

  const sql = `UPDATE responses SET 
    first_name = ?, last_name = ?, response = ?, 
    guest1 = ?, guest2 = ?, guest3 = ?, guest4 = ?, note = ?
    WHERE id = ?`;

  db.query(sql, [
    first_name, last_name, response,
    guest1 || null, guest2 || null, guest3 || null, guest4 || null, note || null, id
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: result.affectedRows });
  });
});

// ---------- DELETE RESPONSE ----------
app.delete('/api/admin/responses/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM responses WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

// ---------- CREATE RESPONSE (MANUAL FROM DASHBOARD) ----------
app.post('/api/admin/responses', authenticate, (req, res) => {
  const {
    first_name, last_name, response,
    guest1, guest2, guest3, guest4, note
  } = req.body;

  const sql = `INSERT INTO responses 
    (first_name, last_name, response, guest1, guest2, guest3, guest4, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    first_name, last_name, response,
    guest1 || null, guest2 || null, guest3 || null, guest4 || null, note || null
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));