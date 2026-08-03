const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
    console.log('Tables:', tables);

    const userDesc = await prisma.$queryRawUnsafe('DESCRIBE user');
    console.log('User table description:', userDesc);

    const user = await prisma.$queryRawUnsafe('SELECT * FROM user WHERE username = "panupong" LIMIT 1');
    console.log('Panupong user:', user);
  } catch (error) {
    console.error('Error:', error);
  }
}
main().finally(() => prisma.$disconnect());
