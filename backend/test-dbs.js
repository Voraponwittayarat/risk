const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const databases = await prisma.$queryRawUnsafe('SHOW DATABASES');
    console.log('Databases:', databases);
  } catch (error) {
    console.error('Error:', error);
  }
}
main().finally(() => prisma.$disconnect());
