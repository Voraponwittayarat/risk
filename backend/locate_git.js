const fs = require('fs');
const path = require('path');

const pathsToCheck = [
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  'C:\\Users\\MSI PAINT\\AppData\\Local\\Programs\\Git\\cmd\\git.exe',
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Users\\MSI PAINT\\AppData\\Local\\Programs\\Git\\bin\\git.exe'
];

async function main() {
  console.log("=== Checking standard Git paths ===");
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      console.log(`Found Git at: ${p}`);
      return;
    }
  }
  console.log("Git not found in standard paths.");
}

main().catch(console.error);
