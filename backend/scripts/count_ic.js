const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const type1 = await p.$queryRawUnsafe("SELECT count(*) as count FROM riskstore WHERE riskstore_name LIKE 'IC%' AND type_id = 1");
  const type2 = await p.$queryRawUnsafe("SELECT count(*) as count FROM riskstore WHERE riskstore_name LIKE 'IC%' AND type_id = 2");
  console.log("IC General (1):", type1[0].count);
  console.log("IC Clinical (2):", type2[0].count);
}
main().finally(() => process.exit(0));
