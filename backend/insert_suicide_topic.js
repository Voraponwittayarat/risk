const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Inserting new riskstore topic: PT/32 ผู้ป่วยฆ่าตัวตายหรือพยายามฆ่าตัวตาย ===");
  
  // Explicitly check if ID 2000071 already exists
  const existing = await prisma.riskstore.findUnique({
    where: { riskstore_id: 2000071 }
  });

  if (existing) {
    console.log("Topic already exists:", existing);
    return;
  }

  // Insert the new topic
  const inserted = await prisma.riskstore.create({
    data: {
      riskstore_id: 2000071,
      riskstore_name: 'PT/32 ผู้ป่วยฆ่าตัวตายหรือพยายามฆ่าตัวตาย',
      inform_id: 8,
      type_id: 2,
      program_id: 6, // PT Program
      level_id: 1,
      group_id: 1,  // Clinical
      team_id: 1,   // PCT Team
      member_cid: '3630100213021',
      status: '1',
      create_date: new Date(),
      modify_date: new Date(),
      created_by: 161,
      updated_by: 161
    }
  });

  console.log("Inserted successfully:", inserted);
}

main().catch(console.error).finally(() => prisma.$disconnect());
