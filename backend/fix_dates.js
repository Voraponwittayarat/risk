const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
  try {
    console.log('Fixing invalid 0000-00-00 dates in MySQL...');
    await prisma.$executeRawUnsafe(`UPDATE riskreview SET modify_date = NULL WHERE CAST(modify_date AS CHAR) LIKE '0000%'`);
    await prisma.$executeRawUnsafe(`UPDATE riskreview SET review_date = NULL WHERE CAST(review_date AS CHAR) LIKE '0000%'`);
    await prisma.$executeRawUnsafe(`UPDATE riskregister SET modify_date = NULL WHERE CAST(modify_date AS CHAR) LIKE '0000%'`);
    await prisma.$executeRawUnsafe(`UPDATE riskregister SET send_date = NULL WHERE CAST(send_date AS CHAR) LIKE '0000%'`);
    await prisma.$executeRawUnsafe(`UPDATE riskregister SET register_date = NULL WHERE CAST(register_date AS CHAR) LIKE '0000%'`);
    console.log('Successfully cleaned up zero dates!');
  } catch (err) {
    console.error('Error fixing dates:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixDates();
