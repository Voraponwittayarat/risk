const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Note: Yii2 uses bcrypt with salt rounds usually 13. We use 10 for testing. 
  // It should still validate correctly using bcrypt.compare.
  
  const user = await prisma.user.upsert({
    where: { username: 'panupong' },
    update: {
      password_hash: hashedPassword,
      cid: '1629900250225',
      role: 10,
    },
    create: {
      username: 'panupong',
      auth_key: 'test_auth_key',
      password_hash: hashedPassword,
      email: 'panupong@example.com',
      status: 10,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
      cid: '1629900250225',
      role: 10,
    },
  });

  console.log('Test user panupong seeded successfully:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
