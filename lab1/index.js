const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();

app.get('/ping', (req, res) => {
  const host = 'google.com'

  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    res.send(stdout || stderr);
  });
});

app.get('/read', (req, res) => {
  const filename = req.query.file;
  const content = fs.readFileSync(filename, 'utf8');
  res.send(content);
});

app.get('/eval', (req, res) => {
  const code = req.query.code;
  const result = eval(code);
  res.json({ result });
});

app.listen(3000, () => {
  console.log('App is listening on port 3000');
  console.log('http://localhost:3000');
});
