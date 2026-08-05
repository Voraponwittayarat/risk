const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Finding latest PT riskstore items ===");
  const ptItems = await prisma.riskstore.findMany({
    where: {
      riskstore_name: { startsWith: 'PT' }
    },
    orderBy: {
      riskstore_id: 'desc'
    },
    take: 10
  });
  console.log("Latest 10 PT items by ID:");
  ptItems.forEach(item => {
    console.log(`  - [ID: ${item.riskstore_id}] ${item.riskstore_name}`);
  });

  const maxIdRow = await prisma.riskstore.findFirst({
    orderBy: {
      riskstore_id: 'desc'
    }
  });
  console.log("Maximum riskstore_id in table:", maxIdRow);
}

main().catch(console.error).finally(() => prisma.$disconnect());
