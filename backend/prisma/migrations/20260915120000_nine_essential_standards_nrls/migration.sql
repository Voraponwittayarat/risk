-- Canonical mapping of the nine essential hospital standards to NRLS incident codes.
-- risk_codes remains backward-compatible with legacy local riskstore IDs; application
-- services now accept either local numeric IDs or direct NRLS codes.
INSERT INTO `nine_standards` (`std_number`, `std_name`, `risk_codes`, `safety_category`) VALUES
  (1, 'การผ่าตัดผิดคน ผิดข้าง ผิดตำแหน่ง ผิดหัตถการ', 'CPS101,CPS102,CPS103', 'Patient Safety'),
  (2, 'การติดเชื้อที่สำคัญในสถานพยาบาลตามบริบทขององค์กรในกลุ่ม SSI, VAP, CAUTI, CLABSI', 'CPI201,CPI202,CPI203,CPS111', 'Patient Safety'),
  (3, 'บุคลากรติดเชื้อจากการปฏิบัติหน้าที่', 'GPI201,GPI202,GPI203,GPI204', 'Personnel Safety'),
  (4, 'การเกิด Medication Error และ Adverse Drug Event', 'CPM101,CPM201,CPM202,CPM203,CPM204,CPM205', 'Patient Safety'),
  (5, 'การให้เลือดผิดคน ผิดหมู่ ผิดชนิด', 'CPM501', 'Patient Safety'),
  (6, 'การระบุตัวผู้ป่วยผิดพลาด', 'CPP101', 'Patient Safety'),
  (7, 'ความคลาดเคลื่อนในการวินิจฉัยโรค', 'CPP301', 'Patient Safety'),
  (8, 'การรายงานผลการตรวจทางห้องปฏิบัติการ/พยาธิวิทยาคลาดเคลื่อน', 'CPL201,CPL203', 'Patient Safety'),
  (9, 'การคัดกรองที่ห้องฉุกเฉินคลาดเคลื่อน', 'CPE402,CPE403,CPE405,CPE407', 'Patient Safety')
ON DUPLICATE KEY UPDATE
  `std_name` = VALUES(`std_name`),
  `risk_codes` = VALUES(`risk_codes`),
  `safety_category` = VALUES(`safety_category`);
