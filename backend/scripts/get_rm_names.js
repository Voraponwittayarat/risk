const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 1 }
  });
  
  for (const u of users) {
    const profile = await prisma.profile.findUnique({ where: { user_id: u.id } });
    console.log(`User ID: ${u.id}, Username: ${u.username}, Name: ${profile ? profile.name : 'Unknown'}`);
  }
}

main().finally(() => process.exit(0));
