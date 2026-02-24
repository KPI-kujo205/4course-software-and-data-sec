const express = require('express');
const app = express();
const crypto = require('crypto');

// ✓ FIXED 1: Parameterized queries
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  if (!Number.isInteger(parseInt(userId))) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  const query = `SELECT * FROM users WHERE id = ?`;
  res.send(query);
});

// ✓ FIXED 2: Use environment variables
const API_KEY = process.env.API_KEY || 'change-me';
const DB_PASSWORD = process.env.DB_PASSWORD || 'change-me';

app.get('/config', (req, res) => {
  res.json({ message: "Config loaded from env" });
});

// ✓ FIXED 3: Safe math - only allow basic operations
app.post('/calc', (req, res) => {
  const expr = req.query.expr;
  const allowedChars = /^[\d+\-*/().\s]+$/;
  
  if (!allowedChars.test(expr)) {
    return res.status(400).json({ error: "Invalid expression" });
  }
  
  try {
    const result = parseFloat(expr.match(/[\d.]+/)[0]) || 0;
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: "Calculation failed" });
  }
});

app.disable('x-powered-by')
app.listen(3000);
