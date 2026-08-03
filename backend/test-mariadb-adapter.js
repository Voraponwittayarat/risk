const mariadb = require('mariadb');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

async function test() {
  try {
    const pool = mariadb.createPool('mariadb://risk:risk1234@localhost:3306/riskhospital?connectionLimit=5');
    const adapter = new PrismaMariaDb(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('Connecting to Prisma natively...');
    await prisma.$connect();
    console.log('Connected!');
    
    await prisma.$disconnect();
    pool.end();
  } catch (err) {
    console.error('Failed to connect:', err);
  }
}

test();
