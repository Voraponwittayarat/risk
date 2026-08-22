const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE department ADD COLUMN telegram_token VARCHAR(255) NULL;');
        console.log('Added telegram_token');
    } catch (e) {
        console.error('Error token:', e.message);
    }
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE department ADD COLUMN telegram_chat_id VARCHAR(100) NULL;');
        console.log('Added telegram_chat_id');
    } catch (e) {
        console.error('Error chat_id:', e.message);
    }
}

main().finally(() => process.exit(0));
