const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'member'
       AND COLUMN_NAME = 'role'`,
  );

  if (Number(existing[0]?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE member ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'staff' AFTER rm_status",
    );
  }

  await prisma.$executeRawUnsafe(`
    UPDATE member
    SET \`role\` = CASE
      WHEN accessrules IN ('1', 'admin') THEN 'admin'
      WHEN rm_status = '1' THEN 'rm_committee'
      WHEN priority = '1' THEN 'head'
      ELSE 'staff'
    END
  `);

  // Keep legacy columns as an exclusive compatibility mirror, never as an authority source.
  await prisma.$executeRawUnsafe(`
    UPDATE member
    SET accessrules = CASE WHEN \`role\` = 'admin' THEN '1' ELSE NULL END,
        rm_status = CASE WHEN \`role\` = 'rm_committee' THEN '1' ELSE NULL END,
        priority = CASE WHEN \`role\` = 'head' THEN '1' ELSE '5' END
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE user u
    INNER JOIN member m ON m.cid = u.cid
    SET u.role = CASE m.\`role\`
      WHEN 'admin' THEN 1
      WHEN 'rm_committee' THEN 10
      WHEN 'head' THEN 20
      ELSE 99
    END
  `);

  const summary = await prisma.$queryRawUnsafe(
    'SELECT `role`, COUNT(*) AS count FROM member GROUP BY `role` ORDER BY `role`',
  );
  console.log(summary.map((row) => ({ role: row.role, count: Number(row.count) })));
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
