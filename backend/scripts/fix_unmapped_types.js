const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  console.log("Fixing unmapped riskstore type_ids...");
  // Clinical
  await p.$executeRawUnsafe(`UPDATE riskstore SET type_id = 2 WHERE nrls_code IS NULL AND (riskstore_name LIKE 'PT%' OR riskstore_name LIKE 'PTC%' OR riskstore_name LIKE 'MED%')`);
  // General
  await p.$executeRawUnsafe(`UPDATE riskstore SET type_id = 1 WHERE nrls_code IS NULL AND (riskstore_name LIKE 'EN%' OR riskstore_name LIKE 'HR%' OR riskstore_name LIKE 'CF%' OR riskstore_name LIKE 'ES%' OR riskstore_name LIKE 'IM%' OR riskstore_name LIKE 'MI%')`);
  console.log("Done.");
}
main().finally(() => process.exit(0));
