import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const icRisks = await prisma.riskstore.findMany({
    where: { 
      riskstore_name: { startsWith: 'IC' }
    },
    select: { riskstore_name: true, group_id: true, program_id: true, type_id: true }
  });
  
  const types = new Set(icRisks.map(r => r.type_id));
  console.log(`Unique type_ids for IC:`, Array.from(types));
  
  const type2 = icRisks.filter(r => r.type_id === 2);
  const type1 = icRisks.filter(r => r.type_id === 1);
  console.log(`Type 1 count: ${type1.length}`);
  console.log(`Type 2 count: ${type2.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
