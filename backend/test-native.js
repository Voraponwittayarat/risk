const { PrismaClient } = require('@prisma/client');

async function test() {
  try {
    const prisma = new PrismaClient(); // No adapter!

    console.log('Connecting to Prisma natively...');
    await prisma.$connect();
    console.log('Connected!');
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('Failed to connect:', err);
  }
}

test();
