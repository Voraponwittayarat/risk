const jwt = require('jsonwebtoken');
require('dotenv').config();
const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: 1, role: 'admin', roles: ['admin'] }, secret);
fetch('http://localhost:3000/incidents/telegram/trigger-summary', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
}).then(res => res.text()).then(console.log).catch(console.error);
