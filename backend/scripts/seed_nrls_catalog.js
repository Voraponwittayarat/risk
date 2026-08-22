const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const content = fs.readFileSync('../../คู่มือ hrms/new standard riskstore.csv', 'utf8');
  const lines = content.split('\n').filter(l => l.trim() !== '');
  
  // Skip header
  lines.shift();
  
  let currentGroup = '';
  let currentCategory = '';
  let currentType = '';
  let currentSubType = '';
  let currentDefinition = '';
  let currentRemark = '';

  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    
    // Simple CSV parser for this specific format
    let code = parts[0] ? parts[0].trim() : '';
    let name = parts[1] ? parts[1].trim() : '';
    let details = parts.slice(2).join(',').trim();
    
    if (code && name) {
        // This is a main entry
        records.push({
            nrls_code: code,
            name: name,
            group: currentGroup,
            category: currentCategory,
            type: currentType,
            sub_type: currentSubType,
            definition: currentDefinition,
            remark: currentRemark
        });
        
        // Reset descriptions for the next entry
        currentDefinition = '';
        currentRemark = '';
    } else {
        // This is a detail line
        if (details.startsWith('กลุ่มอุบัติการณ์')) {
             currentGroup = details.split(':')[1]?.trim() || details;
        } else if (details.startsWith('หมวดอุบัติการณ์')) {
             currentCategory = details.split(':')[1]?.trim() || details;
        } else if (details.startsWith('ประเภทอุบัติการณ์')) {
             currentType = details.split(':')[1]?.trim() || details;
        } else if (details.startsWith('ประเภทย่อยอุบัติการณ์')) {
             currentSubType = details.split(':')[1]?.trim() || details;
        } else if (details.startsWith('นิยาม')) {
             currentDefinition += details + '\n';
        } else if (details.startsWith('หมายเหตุ')) {
             currentRemark += details + '\n';
        } else if (details) {
             // Append to definition if it doesn't match known headers and isn't empty
             if (currentRemark) {
                 currentRemark += details + '\n';
             } else {
                 currentDefinition += details + '\n';
             }
        }
    }
  }

  // Update records with their parsed details (since details come AFTER the main row in the CSV)
  // Wait, looking at the CSV format:
  // CPE101,Un-planed...,กลุ่ม...
  // ,,หมวด...
  // The details are on subsequent lines, BUT the first line contains the first detail string.
  
  console.log(`Prepared ${records.length} records for NRLS_riskstore.`);
  
  for (const record of records) {
      await prisma.nRLS_riskstore.upsert({
          where: { nrls_code: record.nrls_code },
          update: record,
          create: record,
      });
  }
  console.log('Seeding completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
