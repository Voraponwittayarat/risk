const fs = require('fs');
const sql = fs.readFileSync('D:/antigravity project/riskHRMS/riskhospital.sql', 'utf8');
const idx = sql.indexOf('INSERT INTO `riskstore`');
if (idx !== -1) {
    console.log(sql.substring(idx, idx + 500));
} else {
    console.log("Not found.");
}
