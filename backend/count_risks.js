const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cnt = await prisma.risks.count();
  console.log("Total rows in risks (plural) table:", cnt);
  
  const minMax = await prisma.risks.aggregate({
    _min: { id: true },
    _max: { id: true }
  });
  console.log("Min/Max id in risks:", minMax);
}

main().catch(console.error).finally(() => prisma.$disconnect());
