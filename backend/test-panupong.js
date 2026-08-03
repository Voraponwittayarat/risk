const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const members = await prisma.$queryRawUnsafe('SELECT * FROM member WHERE member_name LIKE "%panupong%" OR cid = "panupong" OR accessrules LIKE "%panupong%" LIMIT 5');
    console.log('Members:', members);

    const profiles = await prisma.$queryRawUnsafe('SELECT * FROM profile WHERE name LIKE "%panupong%" OR public_email LIKE "%panupong%" LIMIT 5');
    console.log('Profiles:', profiles);
  } catch (error) {
    console.error('Error:', error);
  }
}
main().finally(() => prisma.$disconnect());
