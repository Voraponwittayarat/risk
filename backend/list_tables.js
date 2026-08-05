const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Listing all tables in MySQL database ===");
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  console.log("Tables in database:", tables);
}

main().catch(console.error).finally(() => prisma.$disconnect());
