const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE NRLS_riskstore ADD COLUMN program_id INT NULL');
        console.log('Added program_id to NRLS_riskstore');
    } catch (e) {
        console.error('Error (might already exist):', e);
    }
}

main().finally(() => process.exit(0));
