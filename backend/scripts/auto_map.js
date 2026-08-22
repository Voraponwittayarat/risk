const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const local = await prisma.riskstore.findMany({ select: { riskstore_id: true, riskstore_name: true } });
  const nrls = await prisma.nRLS_riskstore.findMany({ select: { nrls_code: true, name: true, category: true, sub_type: true } });
  
  console.log(`Local: ${local.length}, NRLS: ${nrls.length}`);
  
  // Basic mapping logic
  let mappedCount = 0;
  for (const lr of local) {
    const localName = lr.riskstore_name.toLowerCase().trim();
    // try exact match or includes
    let match = null;
    
    // Attempt 1: Exact or very close match
    match = nrls.find(n => {
        const nName = n.name.toLowerCase().trim();
        return localName.includes(nName) || nName.includes(localName);
    });

    if (!match) {
        // Attempt 2: Try checking by sub_type
        match = nrls.find(n => {
            return n.sub_type && localName.includes(n.sub_type.toLowerCase().trim());
        });
    }

    if (match) {
        // Update DB
        await prisma.riskstore.update({
            where: { riskstore_id: lr.riskstore_id },
            data: { nrls_code: match.nrls_code }
        });
        mappedCount++;
        console.log(`Mapped [${lr.riskstore_name}] -> [${match.nrls_code}] ${match.name}`);
    }
  }

  console.log(`Successfully mapped ${mappedCount} out of ${local.length} local risks.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
