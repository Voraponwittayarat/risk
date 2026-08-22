const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Restoring original IC risk types from SQL dump...");
    const sql = fs.readFileSync('D:/antigravity project/riskHRMS/riskhospital1.sql', 'utf8');
    
    // Each line starts with INSERT INTO `riskstore` VALUES
    const lines = sql.split('\n');
    let count1 = 0;
    let count2 = 0;
    
    for (const line of lines) {
        if (!line.includes('INSERT INTO `riskstore` VALUES')) continue;
        
        // e.g. INSERT INTO `riskstore` VALUES (1, 'IC/01...', 7, 2, 1, ...
        // Parse the values.
        const match = line.match(/\((\d+),\s*'([^']*)',\s*(?:NULL|\d+),\s*(?:NULL|(\d+)),/);
        if (match) {
            const id = parseInt(match[1]);
            const name = match[2];
            const type_id = parseInt(match[3]);
            
            if (name.startsWith('IC/') && type_id) {
                // Restore in current DB
                await prisma.$executeRawUnsafe(`UPDATE riskstore SET type_id = ${type_id} WHERE riskstore_id = ${id}`);
                if (type_id === 1) count1++;
                if (type_id === 2) count2++;
            }
        }
    }
    
    console.log(`Restored IC General (1-5) items: ${count1}`);
    console.log(`Restored IC Clinical (A-I) items: ${count2}`);
    console.log("Done!");
}

main().finally(() => process.exit(0));
