const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('D:/antigravity project/riskHRMS/riskhospital1.sql');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("=== Finding CREATE TABLE user block ===");
  let inside = false;
  for await (const line of rl) {
    if (line.includes('CREATE TABLE `user`')) {
      inside = true;
    }
    if (inside) {
      console.log(line);
      if (line.includes(') ENGINE =')) {
        break;
      }
    }
  }
}

main().catch(console.error);
