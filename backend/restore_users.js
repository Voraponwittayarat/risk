const fs = require('fs');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Creating user table with complete columns ===");
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS \`user\` (
      \`id\` int(11) NOT NULL AUTO_INCREMENT,
      \`username\` varchar(255) NOT NULL,
      \`password_hash\` varchar(255) NOT NULL,
      \`cid\` varchar(13) DEFAULT NULL,
      \`email\` varchar(255) NOT NULL,
      \`auth_key\` varchar(32) NOT NULL,
      \`confirmed_at\` int(11) DEFAULT NULL,
      \`unconfirmed_email\` varchar(255) DEFAULT NULL,
      \`blocked_at\` int(11) DEFAULT NULL,
      \`registration_ip\` varchar(45) DEFAULT NULL,
      \`role\` smallint(6) NOT NULL DEFAULT 99,
      \`created_at\` int(11) NOT NULL,
      \`updated_at\` int(11) NOT NULL,
      \`flags\` int(11) NOT NULL DEFAULT 0,
      \`last_login_at\` int(11) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`user_unique_username\` (\`username\`),
      UNIQUE KEY \`user_unique_email\` (\`email\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `;

  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`user\``);
    await prisma.$executeRawUnsafe(createTableSql);
    console.log("Table user created successfully.");
  } catch (e) {
    console.error("Error creating table:", e.message);
    return;
  }

  const fileStream = fs.createReadStream('D:/antigravity project/riskHRMS/riskhospital1.sql');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("=== Extracting and inserting data rows into user ===");
  let insertCount = 0;
  let batch = [];
  const BATCH_SIZE = 50;

  for await (const line of rl) {
    if (line.includes('INSERT INTO `user`')) {
      batch.push(line.trim());
      if (batch.length >= BATCH_SIZE) {
        try {
          await executeBatch(batch);
          insertCount += batch.length;
          console.log(`Inserted ${insertCount} users...`);
        } catch (e) {
          console.error("Error inserting batch:", e.message);
        }
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    try {
      await executeBatch(batch);
      insertCount += batch.length;
      console.log(`Inserted final batch. Total users: ${insertCount}`);
    } catch (e) {
      console.error("Error inserting final batch:", e.message);
    }
  }
}

async function executeBatch(statements) {
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
