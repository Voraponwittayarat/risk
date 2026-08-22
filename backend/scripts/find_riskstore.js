const fs = require('fs');
const sql = fs.readFileSync('D:/antigravity project/riskHRMS/riskhospital.sql', 'utf8');
const idx = sql.toLowerCase().indexOf('riskstore');
console.log('idx:', idx);
if (idx !== -1) console.log(sql.substring(idx - 100, idx + 500));
