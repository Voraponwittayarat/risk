const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matchedRisks = await prisma.risks.findMany({
    where: {
      riskstore: { contains: 'ระบุข้อมูลในใบวิสิต' }
    }
  });
  console.log("Matched risks in table:", matchedRisks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
