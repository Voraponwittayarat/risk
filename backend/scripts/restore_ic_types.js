const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const file = fs.readFileSync('D:\\antigravity project\\riskHRMS\\riskhospital.sql', 'utf8');
    // Look for INSERT INTO `riskstore` VALUES ...
    // Note: mysqldump usually does INSERT INTO `riskstore` VALUES (1, 'name', ...), (2, ...);
    
    // Let's just find the block for riskstore.
    const riskstoreLines = file.split('\n').filter(l => l.includes('INSERT INTO `riskstore`'));
    
    let originalRisks = [];
    
    for (const line of riskstoreLines) {
        // extract all (id, 'name', inform_id, type_id, ...)
        // format: (1, 'IC/01 ผู้ป่วยได้รับเชื้อ...', 1, 2, ... )
        const regex = /\((\d+),\s*'([^']*)',\s*(?:NULL|\d+),\s*(?:NULL|(\d+)),/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const id = parseInt(match[1]);
            const name = match[2];
            const type_id = match[3] ? parseInt(match[3]) : null;
            
            if (name.startsWith('IC/')) {
                originalRisks.push({ id, name, type_id });
            }
        }
    }
    
    console.log(`Found ${originalRisks.length} IC risks in SQL dump.`);
    
    let type1 = 0;
    let type2 = 0;
    
    for (const r of originalRisks) {
        if (r.type_id === 1) type1++;
        if (r.type_id === 2) type2++;
        
        // Restore it!
        if (r.type_id !== null) {
            await prisma.$executeRawUnsafe(`UPDATE riskstore SET type_id = ${r.type_id} WHERE riskstore_id = ${r.id}`);
        }
    }
    
    console.log(`Restored IC General (1): ${type1}`);
    console.log(`Restored IC Clinical (2): ${type2}`);
    console.log("Restoration complete.");
}

main().finally(() => process.exit(0));
