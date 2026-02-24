const express = require('express');
const app = express();
const port = 3000;

// VULNERABILITY 1: SQL Injection
// Використання конкатенації строк для створення SQL запитів
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  // Вразливість: SQL Injection через конкатенацію
  const query = "SELECT * FROM users WHERE id = " + userId;
  console.log("Executing query: " + query);
  res.json({ message: "Query executed", query: query });
});

// VULNERABILITY 2: Hardcoded Credentials
// Пароль жорстко закодований у коді
const API_KEY = "super-secret-key-12345";
const DATABASE_PASSWORD = "admin123456";
const JWT_SECRET = "my-secret-jwt-key-exposed";

app.get('/api/config', (req, res) => {
  res.json({ 
    apiKey: API_KEY,
    dbPassword: DATABASE_PASSWORD,
    jwtSecret: JWT_SECRET
  });
});

// VULNERABILITY 3: Code Injection / Insecure Eval
// Використання eval() з користувацьким вводом
app.post('/calculate', (req, res) => {
  try {
    const expression = req.query.expr;
    // Вразливість: Code Injection через eval()
    const result = eval(expression);
    res.json({ result: result, expression: expression });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// VULNERABILITY 4: Insecure Randomness (додаткова)
const crypto = require('crypto');
app.get('/token', (req, res) => {
  // Вразливість: Слабка генерація токена
  const token = Math.random().toString(36).substring(7);
  res.json({ token: token });
});

// VULNERABILITY 5: Missing Input Validation
// Відсутня валідація і санітизація
app.post('/upload', (req, res) => {
  const filename = req.query.filename;
  const path = require('path');
  // Вразливість: Path Traversal
  const filepath = "/uploads/" + filename;
  res.json({ filepath: filepath });
});

// VULNERABILITY 6: Unsafe regular expression
function validateEmail(email) {
  // Вразливість: ReDoS (Regular Expression Denial of Service)
  const pattern = /^([a-zA-Z0-9]+)*@([a-zA-Z0-9]+)*\.([a-zA-Z0-9]+)*$/;
  return pattern.test(email);
}

app.get('/validate-email', (req, res) => {
  const email = req.query.email;
  const isValid = validateEmail(email);
  res.json({ email: email, valid: isValid });
});

// VULNERABILITY 7: Missing Authentication
app.delete('/admin/delete-all', (req, res) => {
  // Вразливість: Відсутня перевірка прав доступу
  console.log("Deleting all users...");
  res.json({ message: "All users deleted" });
});

// VULNERABILITY 8: Insecure Deserialization
const pickle = require('pickle');
app.post('/deserialize', (req, res) => {
  try {
    const data = req.query.data;
    // Вразливість: Insecure Deserialization
    const obj = JSON.parse(data);
    res.json({ object: obj });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// VULNERABILITY 9: No HTTPS / Insecure Communication
app.get('/password-reset', (req, res) => {
  const password = req.query.newPassword;
  // Вразливість: Передача пароля через URL без HTTPS
  res.json({ message: "Password changed", password: password });
});

// VULNERABILITY 10: Dead Code and Code Duplication
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

function calculateTotalDuplicate(items) {
  // Дублювання коду
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

let unusedVariable = "This variable is never used";

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`DB Password: ${DATABASE_PASSWORD}`);
});
