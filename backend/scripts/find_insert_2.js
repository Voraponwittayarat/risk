const fs = require('fs');
const sql = fs.readFileSync('D:/antigravity project/riskHRMS/riskhospital1.sql', 'utf8');
const idx = sql.toLowerCase().indexOf('insert into `riskstore`');
if (idx !== -1) console.log(sql.substring(idx, idx + 500));
else console.log("Not found.");
