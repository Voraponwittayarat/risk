const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Update NRLS_riskstore groups
    console.log("Updating NRLS_riskstore groups...");
    
    await prisma.$executeRawUnsafe(`
        UPDATE NRLS_riskstore 
        SET \`group\` = 'อุบัติการณ์ความเสี่ยงด้านคลินิก : C'
        WHERE nrls_code LIKE 'C%'
    `);
    
    await prisma.$executeRawUnsafe(`
        UPDATE NRLS_riskstore 
        SET \`group\` = 'อุบัติการณ์ความเสี่ยงทั่วไป : G'
        WHERE nrls_code LIKE 'G%'
    `);

    // 2. Sync riskstore type_id based on their mapped NRLS_code
    console.log("Syncing riskstore type_id (1 = ทั่วไป, 2 = คลินิก)...");
    
    await prisma.$executeRawUnsafe(`
        UPDATE riskstore 
        SET type_id = 1 
        WHERE nrls_code LIKE 'G%'
    `);
    
    await prisma.$executeRawUnsafe(`
        UPDATE riskstore 
        SET type_id = 2 
        WHERE nrls_code LIKE 'C%'
    `);

    console.log("Update completed successfully!");
}

main().catch(console.error).finally(() => process.exit(0));
