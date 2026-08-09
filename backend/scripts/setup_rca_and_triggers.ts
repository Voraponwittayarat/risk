import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Database Migration for RCA & Trigger Tool modules...');

  // 1. trigger_tool_master
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS trigger_tool_master (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      definition TEXT NOT NULL,
      source VARCHAR(255) NOT NULL,
      reviewer_role VARCHAR(255) NOT NULL,
      category VARCHAR(100) NULL,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. medical_record_review
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS medical_record_review (
      id INT AUTO_INCREMENT PRIMARY KEY,
      review_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewer_name VARCHAR(255) NOT NULL,
      department VARCHAR(100) NOT NULL,
      hn VARCHAR(50) NOT NULL,
      an VARCHAR(50) NULL,
      admit_date DATE NULL,
      discharge_date DATE NULL,
      diagnosis TEXT NULL,
      has_trigger BOOLEAN DEFAULT FALSE,
      has_adverse_event BOOLEAN DEFAULT FALSE,
      has_error BOOLEAN DEFAULT FALSE,
      severity_level VARCHAR(10) NULL,
      preventability VARCHAR(50) NULL,
      ae_description TEXT NULL,
      standard_rca_id VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. trigger_finding
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS trigger_finding (
      id INT AUTO_INCREMENT PRIMARY KEY,
      review_id INT NOT NULL,
      trigger_id INT NOT NULL,
      trigger_name VARCHAR(255) NOT NULL,
      detail TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_review_id (review_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. rca_case (Mini & Concise)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rca_case (
      id VARCHAR(50) PRIMARY KEY,
      topic VARCHAR(255) NOT NULL,
      rca_type VARCHAR(20) DEFAULT 'mini',
      review_date DATETIME NOT NULL,
      incident_date DATETIME NULL,
      incident_detail TEXT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. rca_incident_item (Join table for Concise RCA multi-cases)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rca_incident_item (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rca_case_id VARCHAR(50) NOT NULL,
      incident_id INT NOT NULL,
      incident_id_risk INT NOT NULL DEFAULT 0,
      risk_name VARCHAR(255) NULL,
      report_date DATE NULL,
      severity_level VARCHAR(10) NULL,
      department_id VARCHAR(10) NULL,
      detail TEXT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rca_case_id (rca_case_id),
      INDEX idx_incident_id (incident_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. rca_swiss_cheese
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rca_swiss_cheese (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rca_case_id VARCHAR(50) NOT NULL,
      layer VARCHAR(50) NOT NULL,
      hole TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_swiss_rca_case_id (rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. rca_cmp
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rca_cmp (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rca_case_id VARCHAR(50) NOT NULL,
      process VARCHAR(100) NULL,
      cmp_problem TEXT NOT NULL,
      corrective_action TEXT NOT NULL,
      responsible_unit VARCHAR(100) NULL,
      status VARCHAR(50) DEFAULT 'pending',
      due_date DATE NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cmp_rca_case_id (rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. rca_reviewer
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rca_reviewer (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rca_case_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(100) NULL,
      department VARCHAR(100) NULL,
      sort_order INT DEFAULT 0,
      INDEX idx_rev_rca_case_id (rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. standard_rca_case
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_case (
      id VARCHAR(50) PRIMARY KEY,
      rm_no VARCHAR(50) NULL,
      rca_type VARCHAR(20) DEFAULT 'full',
      incident_id INT NULL,
      incident_id_risk INT NULL,
      source_trigger_review_id INT NULL,
      topic VARCHAR(255) NOT NULL,
      incident_date DATETIME NULL,
      rca_team VARCHAR(255) NULL,
      severity VARCHAR(10) NULL,
      is_not_risk BOOLEAN DEFAULT FALSE,
      what_happened TEXT NULL,
      actual_impact TEXT NULL,
      potential_impact TEXT NULL,
      info_interview BOOLEAN DEFAULT FALSE,
      info_cctv BOOLEAN DEFAULT FALSE,
      info_document BOOLEAN DEFAULT FALSE,
      info_inspection BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'pending',
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. standard_rca_timeline
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_timeline (
      id INT AUTO_INCREMENT PRIMARY KEY,
      standard_rca_case_id VARCHAR(50) NOT NULL,
      event_time VARCHAR(100) NOT NULL,
      event_date DATE NULL,
      event_description TEXT NOT NULL,
      is_critical_point BOOLEAN DEFAULT FALSE,
      tag VARCHAR(50) NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_std_timeline_case_id (standard_rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11. standard_rca_why
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_why (
      id INT AUTO_INCREMENT PRIMARY KEY,
      standard_rca_case_id VARCHAR(50) NOT NULL,
      level INT NOT NULL,
      question TEXT NULL,
      answer TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_std_why_case_id (standard_rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 12. standard_rca_fishbone
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_fishbone (
      id INT AUTO_INCREMENT PRIMARY KEY,
      standard_rca_case_id VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      factor TEXT NOT NULL,
      sub_factor TEXT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_std_fish_case_id (standard_rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 13. standard_rca_process_analysis
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_process_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      standard_rca_case_id VARCHAR(50) NOT NULL,
      process_key VARCHAR(100) NOT NULL,
      problem TEXT NULL,
      tier1_personnel TEXT NULL,
      tier2_teamwork TEXT NULL,
      tier3_environment TEXT NULL,
      tier4_policy TEXT NULL,
      tier5_external TEXT NULL,
      corrective_action TEXT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_std_process_case_id (standard_rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 14. standard_rca_capa
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_capa (
      id INT AUTO_INCREMENT PRIMARY KEY,
      standard_rca_case_id VARCHAR(50) NOT NULL,
      action TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      responsible VARCHAR(255) NOT NULL,
      due_date DATE NULL,
      status VARCHAR(50) DEFAULT 'pending',
      evidence TEXT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_std_capa_case_id (standard_rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 15. standard_rca_review_session
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS standard_rca_review_session (
      id INT AUTO_INCREMENT PRIMARY KEY,
      standard_rca_case_id VARCHAR(50) NOT NULL,
      reviewers TEXT NULL,
      review_date_time DATETIME NULL,
      notes TEXT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_std_session_case_id (standard_rca_case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 16. Safely add columns to riskregister with relaxed sql_mode
  await prisma.$executeRawUnsafe(`SET SESSION sql_mode = '';`);

  const checkAndAddColumn = async (colName: string, colDef: string) => {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE riskregister ADD COLUMN ${colName} ${colDef};`);
      console.log(`+ Added column ${colName} to riskregister`);
    } catch (e: any) {
      if (e.message?.includes('Duplicate column name') || e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  Column ${colName} already exists in riskregister`);
      } else {
        console.warn(`  Note on column ${colName}:`, e.message);
      }
    }
  };

  await checkAndAddColumn('is_sec41', 'TINYINT(1) DEFAULT 0');
  await checkAndAddColumn('is_potential_harm', 'TINYINT(1) DEFAULT 0');
  await checkAndAddColumn('rca_required', 'TINYINT(1) DEFAULT 0');
  await checkAndAddColumn('rca_criteria_match', 'VARCHAR(100) NULL');
  await checkAndAddColumn('rca_status', 'VARCHAR(50) DEFAULT "NONE"');
  await checkAndAddColumn('rca_case_id', 'VARCHAR(50) NULL');

  // 17. Seed Wang Chao Hospital 2568 Trigger Tools (11 items)
  const initialTriggerTools = [
    {
      code: 'TT-01',
      name: 'เสียชีวิตในโรงพยาบาล',
      definition: 'การเสียชีวิตของผู้ป่วยขณะรักษาตัวในโรงพยาบาลทั้งหมด',
      source: 'ทะเบียนใบdeath',
      reviewer_role: 'ER ทบทวนในเวร / IPD',
      category: 'Care',
      sort_order: 1
    },
    {
      code: 'TT-02',
      name: 'Unplan refer IPD',
      definition: 'การส่งต่อผู้ป่วยจาก โดยไม่มีการวางแผนล่วงหน้า',
      source: 'Ipd, risk',
      reviewer_role: 'IPD',
      category: 'Care',
      sort_order: 2
    },
    {
      code: 'TT-03',
      name: 'อาการทรุดลงภายใน 24 ชม และ refer IPD',
      definition: 'ผู้ป่วยทรุดลงอาการและต้องมีการส่งต่อภายใน 24 ชั่วโมงหลังรับการรักษา',
      source: 'Itดึงจาก เวลาrefer - เวลาvisit < 24ชม',
      reviewer_role: 'IPD',
      category: 'Care',
      sort_order: 3
    },
    {
      code: 'TT-04',
      name: 'Readmit ภายใน 28 วัน',
      definition: 'การกลับมารับการรักษาในหอผู้ป่วยในใหม่ภายใน 28 วันหลังจำหน่าย',
      source: 'It ดึง',
      reviewer_role: 'IPD',
      category: 'Care',
      sort_order: 4
    },
    {
      code: 'TT-05',
      name: 'Re-visit ใน ER ใน 48 ชั่วโมง',
      definition: 'ผู้ป่วยกลับมาใช้บริการ ER ซ้ำภายใน 48 ชั่วโมง',
      source: 'ทบทวนท้ายเวร',
      reviewer_role: 'ER',
      category: 'ER',
      sort_order: 5
    },
    {
      code: 'TT-06',
      name: 'ทรุดลงขณะทำการรักษา ER',
      definition: 'ผู้ป่วยมีอาการแย่ลงขณะรักษาใน ER',
      source: 'Erเก็บเข้าrisk ->ดึงจาก risk',
      reviewer_role: 'ER',
      category: 'ER',
      sort_order: 6
    },
    {
      code: 'TT-07',
      name: 'คัดแยกผู้ป่วยในห้องฉุกเฉินคลาดเคลื่อน',
      definition: 'การจำแนกความรุนแรงของผู้ป่วยผิดพลาดใน ER',
      source: 'itดึง',
      reviewer_role: 'ER',
      category: 'ER',
      sort_order: 7
    },
    {
      code: 'TT-08',
      name: 'ผู้ป่วยที่ได้รับยา Dexa,CPM',
      definition: 'การได้รับยาที่อาจจะทำให้ผู้ป่วยเกิดอาการแพ้',
      source: 'itดึง',
      reviewer_role: 'ห้องยา',
      category: 'Medication',
      sort_order: 8
    },
    {
      code: 'TT-09',
      name: 'ข้อร้องเรียน ม.41',
      definition: 'ผู้ป่วยหรือญาติมีการร้องเรียนเกี่ยวกับการรักษา',
      source: 'พี่แววส่งข้อมูล',
      reviewer_role: 'ESBกลุ่มการพยาบาล',
      category: 'Nursing',
      sort_order: 9
    },
    {
      code: 'TT-10',
      name: 'ผู้ป่วยที่ได้รับการวินิจฉัยว่ามีการติดเชื้อในโรงพยาบาล',
      definition: 'การติดเชื้อที่เกิดขึ้นภายในโรงพยาบาล',
      source: 'พี่นิเก็บเอง และดูเองว่าเป็นriskไหม',
      reviewer_role: 'IC',
      category: 'IC',
      sort_order: 10
    },
    {
      code: 'TT-11',
      name: 'Hemoculture ให้ผลบวก',
      definition: 'ผลการเพาะเชื้อในเลือดเป็นบวก และต้องวิเคราะห์ว่ามีภาวะ Sepsis หรือไม่',
      source: 'เฟิร์น+labเก็บข้อมูล แล้วให้แพทย์ที่รับผิดชอบsepsisดูว่ามีเหตุmiss sepsisไหม',
      reviewer_role: 'แพทย์ที่รับผิดชอบsepsis',
      category: 'Sepsis',
      sort_order: 11
    }
  ];

  console.log('🌱 Seeding 11 Wang Chao Hospital 2568 Trigger Tools...');
  for (const item of initialTriggerTools) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO trigger_tool_master (code, name, definition, source, reviewer_role, category, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        definition = VALUES(definition),
        source = VALUES(source),
        reviewer_role = VALUES(reviewer_role),
        category = VALUES(category),
        sort_order = VALUES(sort_order);
    `, item.code, item.name, item.definition, item.source, item.reviewer_role, item.category, item.sort_order);
  }

  console.log('✅ Migration and Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
