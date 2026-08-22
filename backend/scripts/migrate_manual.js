const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe("SET SESSION sql_mode = '';");
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE riskregister ADD COLUMN nrls_code VARCHAR(50) DEFAULT NULL;');
    console.log('Added nrls_code to riskregister');
  } catch (e) {
    console.log(e.message);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
