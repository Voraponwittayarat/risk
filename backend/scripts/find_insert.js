const fs = require('fs');
const sql = fs.readFileSync('D:/antigravity project/riskHRMS/riskhospital.sql', 'utf8');
const idx = sql.toLowerCase().indexOf('insert into riskstore');
const idx2 = sql.toLowerCase().indexOf('insert into `riskstore`');
console.log('idx:', idx, 'idx2:', idx2);
if (idx !== -1) console.log(sql.substring(idx, idx + 500));
else if (idx2 !== -1) console.log(sql.substring(idx2, idx2 + 500));
