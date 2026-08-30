const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const teams = [
  [1, 'PCT ทีมดูแลรักษาผู้ป่วย'],
  [2, 'IM/IT ทีมสารสนเทศและเวชระเบียน'],
  [3, 'IC ทีมป้องกันและการควบคุมการติดเชื้อในโรงพยาบาล'],
  [4, 'ESB ทีมสิทธิผู้ป่วยจริยธรรมและข้อร้องเรียน'],
  [5, 'HRD,CFO ทีมการบริหารจัดการองค์กร'],
  [6, 'MI ทีมเครื่องมือและอุปกรณ์ทางการแพทย์'],
  [8, 'ENV ทีมสาธารณูปโภค/สิ่งแวดล้อม/ความปลอดภัย/เครื่องมือและอุปกรณ์ทั่วไป'],
  [9, 'RM ทีมความเสี่ยง'],
  [10, 'PTC ทีมความปลอดภัยด้านยา'],
];

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE member
    ADD COLUMN IF NOT EXISTS rm_scope VARCHAR(20) NULL AFTER role
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE member
    SET rm_scope = CASE
      WHEN role = 'rm_committee' AND rm_scope IN ('department', 'group', 'hospital') THEN rm_scope
      WHEN role = 'rm_committee' THEN 'department'
      ELSE NULL
    END
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS team (
      id INT NOT NULL AUTO_INCREMENT,
      team_name VARCHAR(150) NOT NULL COMMENT 'ทีมนำ',
      create_date DATETIME NULL,
      modify_date TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  for (const [id, name] of teams) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO team (id, team_name, create_date, modify_date, created_by, updated_by)
       VALUES (?, ?, NOW(), NOW(), 1, 1)
       ON DUPLICATE KEY UPDATE team_name = VALUES(team_name)`,
      id,
      name,
    );
  }

  console.log(`RM scope migrated and ${teams.length} lead teams are ready.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
