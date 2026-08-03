const mariadb = require('mariadb');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const pool = mariadb.createPool('mariadb://root@localhost:3306/riskhospital');
const adapter = new PrismaMariaDb(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const data = await prisma.riskregister.findMany({ take: 1 });
  console.log('Query success:', data);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
