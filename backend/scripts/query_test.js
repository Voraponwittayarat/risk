const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const depts = await prisma.department.findMany({ where: { depart_name: { contains: 'หน่วยที่ 2' } } });
  console.log('Departments:', depts);
  const locs = await prisma.location.findMany({ where: { name: { contains: 'หน่วยที่ 2' } } });
  console.log('Locations:', locs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
