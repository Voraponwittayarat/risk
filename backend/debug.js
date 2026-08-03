const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany({
    take: 5,
    select: { user_id: true, name: true }
  });
  console.log('Profiles:', profiles);

  const profile = await prisma.profile.findFirst({
    where: { name: '1629900250225' }
  });
  console.log('Search 1629900250225 in Profile:', profile);
  
  const member = await prisma.member.findFirst({
    where: { cid: '1629900250225' }
  });
  console.log('Search 1629900250225 in Member:', member);
  
  const members = await prisma.member.findMany({
    take: 5,
    select: { cid: true, member_name: true }
  });
  console.log('Members:', members);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
