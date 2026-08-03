import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding riskanalysis and riskanalysis_review mock data based on official Hospital Risk Register...');

  // Clear existing riskanalysis data
  await prisma.riskanalysis_review.deleteMany();
  await prisma.riskanalysis.deleteMany();

  const risks = [
    // --- 1. HOSPITAL LEVEL RISKS ---
    {
      risk_code: 'STD-01',
      risk_title: 'ความคลาดเคลื่อนในการวินิจฉัยโรค (Missed / Delayed / Wrong Diagnosis)',
      risk_description: 'กรณีที่ไม่สามารถวินิจฉัยปัญหาสุขภาพของผู้ป่วยได้อย่างถูกต้องและทันท่วงที หรือเกิดความล่าช้าในกลุ่มโรคสำคัญ (เช่น Sepsis, Stroke, STEMI, Acute Appendicitis)',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'hospital',
      department_id: '1',
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Patient Safety (P: Diagnostic Excellence)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 2: การวินิจฉัยโรคและการประเมินผู้ป่วย (มาตรฐาน III-2)',
      risk_owner_name: 'นพ.สุกาญจน์ คงใจ (ประธาน PCT)',
      is_never_event: 0,
      initial_likelihood: 4,
      initial_consequence: 5,
      initial_risk_score: 20,
      initial_risk_level: 'red',
      risk_prevention: '1. แนวทางการคัดกรองผู้ป่วย Sepsis / Fast Track\n2. Early Warning Signs (MEWS)\n3. สรุปแนวทางการดูแลรักษาผู้ป่วย Pop-up ในระบบ HOSxP\n4. CPG การวินิจฉัยโรคสำคัญ',
      risk_transfer: 'ส่งต่อเคสความรุนแรงระดับ E ขึ้นไปให้ PCT และคณะกรรมการบริหารความเสี่ยงทบทวน RCA',
      risk_monitor: '1. รายงานอุบัติการณ์ PT/33 ผู้ป่วยอาการทรุดลง\n2. PT/03.01 Re-visit ภายใน 48 ชม. ที่ ER\n3. PT/39 Re-admit ภายใน 28 วัน IPD\n4. ทบทวนเวชระเบียนกลุ่มโรคสำคัญ',
      risk_mitigation: 'ตรวจวินิจฉัยเพิ่มเติม ส่งต่อแพทย์เฉพาะทางทันที และให้การรักษาประคับประคองตามแนวทางวิกฤต',
      qi_plan: 'โครงการพัฒนาระบบ AI Clinical Decision Support (CDS) แจ้งเตือนภาวะ Sepsis ล่วงหน้า',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-06-15'),
      next_review_date: new Date('2026-09-15'),
      residual_risk_level: 'yellow',
      status: 'open',
      reviews: [
        {
          review_date: new Date('2026-06-15'),
          review_cycle_no: 1,
          result_of_review: 'ผู้ป่วยไม่แจ้งอาการที่แท้จริง อาการแสดงไม่ชัดเจน บุคลากรเหนื่อยล้า ได้จัดทำแนวทาง Pop-up HOSxP เตือนแพทย์',
          incident_count_in_period: 2,
          current_likelihood: 2,
          current_consequence: 4,
          current_risk_score: 8,
          current_risk_level: 'yellow',
          updated_prevention: 'เน้นย้ำการ Re-evaluate สัญญาณชีพทุก 2 ชม. ในรายที่มี MEWS score >= 2',
          is_escalated: 0,
          escalation_target: 'PCT Committee',
          reviewed_by: 'นพ.สุกาญจน์ คงใจ'
        }
      ]
    },
    {
      risk_code: 'STD-02',
      risk_title: 'การให้เลือดผิดคน ผิดหมู่ ผิดชนิด (Blood Transfusion Error)',
      risk_description: 'การที่ผู้ป่วยได้รับเลือดหรือส่วนประกอบของเลือดที่ไม่ตรงกับข้อมูลจำเพาะของผู้ป่วย เช่น หมู่เลือด ABO, Rh หรือชนิดผลิตภัณฑ์เลือด',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'hospital',
      department_id: '10',
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Patient Safety (P: Safe Blood Administration)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 5: การบริการธนาคารเลือดและโลหิต (มาตรฐาน II-7.4)',
      risk_owner_name: 'ทนพญ.เบญจมาศ มงคล (หัวหน้ากลุ่มงานเทคนิคการแพทย์)',
      is_never_event: 1,
      initial_likelihood: 2,
      initial_consequence: 5,
      initial_risk_score: 10,
      initial_risk_level: 'orange',
      risk_prevention: '1. QP-LAB-015 แนวทางการป้องกันการให้เลือดผิดคน ผิดหมู่ ผิดชนิด\n2. WI-LAB-BB001 การตรวจหมู่โลหิต ABO/Rh\n3. Bedside 2-Nurse Independent Double Check ก่อนเจาะเลือดและก่อนให้เลือด\n4. ตรวจสอบบัตรประชาชน/HN คู่กับถุงเลือด',
      risk_transfer: 'คณะกรรมการธนาคารเลือดและทีมนำทางคลินิก (PTC/PCT)',
      risk_monitor: '1. อัตราความคลาดเคลื่อนในการขอเลือด/เจาะสิ่งส่งตรวจ (เป้าหมาย = 0)\n2. อัตราการเกิดปฏิกิริยาไม่พึงประสงค์จากการให้เลือด (Adverse Transfusion Reaction)',
      risk_mitigation: 'หยุดให้เลือดทันที คงสายน้ำเกลือ NSS ตรวจสอบสัญญาณชีพ รายงานแพทย์เวร เจาะเลือดซ้ำตรวจ Hemolysis และส่งถุงเลือดคืนห้องแล็ป',
      qi_plan: 'ระบบ Barcode Scanning สแกนข้อมือผู้ป่วยคู่กับ Barcode บนถุงเลือดก่อนเริ่มให้เลือด (Barcode Blood Safety)',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-05-10'),
      next_review_date: new Date('2026-08-10'),
      residual_risk_level: 'green',
      status: 'monitoring',
      reviews: [
        {
          review_date: new Date('2026-05-10'),
          review_cycle_no: 1,
          result_of_review: 'ยังไม่เคยเกิดอุบัติการณ์การให้เลือดผิดคนหรือผิดหมู่ในรอบ 12 เดือนที่ผ่านมา มีการสุ่ม audit การ double check ครบ 100%',
          incident_count_in_period: 0,
          current_likelihood: 1,
          current_consequence: 5,
          current_risk_score: 5,
          current_risk_level: 'yellow',
          updated_prevention: 'รณรงค์การติดแท็กสีแดงสำหรับถุงเลือดที่มีความจำเพาะพิเศษ',
          is_escalated: 0,
          escalation_target: 'Lab & Blood Bank Committee',
          reviewed_by: 'ทนพญ.เบญจมาศ มงคล'
        }
      ]
    },
    {
      risk_code: 'STD-03',
      risk_title: 'การเกิด Medication Error และ Adverse Drug Event ในยากลุ่มความเสี่ยงสูง (HAD)',
      risk_description: 'ความคลาดเคลื่อนในการสั่งใช้ จ่าย หรือบริหารยากลุ่ม High Alert Drugs (เช่น Insulin, Potassium, Morphine, Warfarin) รวมถึงการจ่ายยาที่ผู้ป่วยมีประวัติแพ้ซ้ำ',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'hospital',
      department_id: '8',
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Medication Safety (M: Safe HAD & Allergy Alert)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 4: การกำกับดูแลการจัดการด้านยา (มาตรฐาน II-6.1)',
      risk_owner_name: 'ภก.นฤมล ไกลทุกข์ (หัวหน้ากลุ่มงานเภสัชกรรม)',
      is_never_event: 1,
      initial_likelihood: 4,
      initial_consequence: 4,
      initial_risk_score: 16,
      initial_risk_level: 'red',
      risk_prevention: '1. บันทึกข้อมูลประวัติการแพ้ยาในระบบ HOSxP พร้อม Pop-up Alert แบบ Hard Stop\n2. แยกเก็บยา HAD พร้อมติดสติ๊กเกอร์สีแดงสะท้อนแสง\n3. การอ่านทวนและ Double Check 2 คนก่อนจ่ายยาและก่อนบริหารยา\n4. ตาราง Rate การให้ยาทางหลอดเลือดดำติดไว้ที่เครื่อง Infusion Pump',
      risk_transfer: 'คณะกรรมการเภสัชกรรมและการบำบัด (PTC)',
      risk_monitor: '1. อุบัติการณ์จ่ายยาแพ้ซ้ำ (เป้าหมาย = 0)\n2. อัตรา Medication Error ระดับ E ขึ้นไป\n3. สุ่มตรวจกระบวนการ Double Check HAD ทุกหอผู้ป่วย',
      risk_mitigation: 'หยุดยาทันที ให้ยาต้านพิษ (Antidote) ประเมิน ABCs รายงานแพทย์เวร และเฝ้าระวังสัญญาณชีพอย่างใกล้ชิด',
      qi_plan: 'โครงการพัฒนาระบบ Smart Smart HAD Box สแกน QR Code ก่อนหยิบยาในห้องฉุกเฉินและหอผู้ป่วย',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-07-01'),
      next_review_date: new Date('2026-10-01'),
      residual_risk_level: 'yellow',
      status: 'open',
      reviews: [
        {
          review_date: new Date('2026-07-01'),
          review_cycle_no: 1,
          result_of_review: 'พบ Near Miss สั่งยา Potassium IV Push 1 ครั้ง ถูกดักจับได้ที่ห้องยา มาตรการ Pop-up ใน HOSxP ทำงานได้ผลดี',
          incident_count_in_period: 1,
          current_likelihood: 2,
          current_consequence: 4,
          current_risk_score: 8,
          current_risk_level: 'yellow',
          updated_prevention: 'ยกเลิกการเก็บ Potassium Chloride เข้มข้นในทุก Ward ให้นำมาจากห้องยาเฉพาะรายเท่านั้น',
          is_escalated: 0,
          escalation_target: 'PTC Committee',
          reviewed_by: 'ภก.นฤมล ไกลทุกข์'
        }
      ]
    },
    {
      risk_code: 'STD-04',
      risk_title: 'การติดเชื้อที่สำคัญในสถานพยาบาล (CAUTI, VAP, SSI, HAP)',
      risk_description: 'การติดเชื้อในผู้ป่วยระหว่างรับการรักษาในโรงพยาบาล เช่น แผลผ่าตัดติดเชื้อ ปอดอักเสบจากการใช้เครื่องช่วยหายใจ หรือติดเชื้อในทางเดินปัสสาวะจากการคาสายสวน',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'hospital',
      department_id: '1',
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Infection Prevention (I: Hospital Acquired Infection Control)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 3: การปฏิบัติเพื่อป้องกันการติดเชื้อ (มาตรฐาน II-4.2)',
      risk_owner_name: 'พว.พชรพิมพ์ ขาวทุ่ง (พยาบาลควบคุมการติดเชื้อ ICN)',
      is_never_event: 0,
      initial_likelihood: 3,
      initial_consequence: 3,
      initial_risk_score: 9,
      initial_risk_level: 'orange',
      risk_prevention: '1. ปฏิบัติตาม WP-IC-001 การป้องกันและควบคุมโรคติดเชื้อ\n2. 5 Moments for Hand Hygiene\n3. Care Bundle สำหรับ CAUTI, VAP, SSI\n4. การจัดท่านอน Fowler\'s Position 30-45 องศาในผู้ป่วยเสี่ยง HAP',
      risk_transfer: 'คณะกรรมการควบคุมโรคติดเชื้อในโรงพยาบาล (IC Committee)',
      risk_monitor: '1. อัตราการเกิด CAUTI (< 2.0 / 1,000 Catheter-days)\n2. อัตราการติดเชื้อแผลสะอาด (Clean Wound SSI < 1.0%)\n3. Hand Hygiene Compliance Rate (> 85%)',
      risk_mitigation: 'เก็บ Pus/Sputum/Urine ส่งเพาะเชื้อ (C/S) ปรึกษาแพทย์ให้ยาปฏิชีวนะตรงตาม Sens และแยกผู้ป่วยตามหลัก Isolation Precautions',
      qi_plan: 'โครงการคลีนิกสะอาดปลอดเชื้อ: หอผู้ป่วยร่วมใจ ล้างมือถูกต้อง 7 ขั้นตอน 100%',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-06-20'),
      next_review_date: new Date('2026-09-20'),
      residual_risk_level: 'yellow',
      status: 'monitoring',
      reviews: [
        {
          review_date: new Date('2026-06-20'),
          review_cycle_no: 1,
          result_of_review: 'ปี 2567 ไม่พบการติดเชื้อในแผลสะอาด (0/27 ราย) แต่พบ HAP ในผู้สูงอายุ 2 ราย ได้จัดทำแนวทาง Fowler position สำเร็จ',
          incident_count_in_period: 2,
          current_likelihood: 2,
          current_consequence: 3,
          current_risk_score: 6,
          current_risk_level: 'yellow',
          updated_prevention: 'เพิ่มการประเมิน Braden Scale ร่วมกับประวัติ Pneumonia เดิม',
          is_escalated: 0,
          escalation_target: 'IC Committee',
          reviewed_by: 'พว.พชรพิมพ์ ขาวทุ่ง'
        }
      ]
    },
    {
      risk_code: 'STD-05',
      risk_title: 'การผ่าตัดและหัตถการผิดคน ผิดข้าง ผิดตำแหน่ง ผิดหัตถการ (Surgical / Procedure Error)',
      risk_description: 'การทำหัตถการผ่าตัด (เช่น ถอนฟัน/ผ่าฟันคุด, ผ่าตัดเล็ก Minor Surgery, เย็บแผล) ผิดคน ผิดข้าง ผิดซี่ หรือผิดตำแหน่ง',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'hospital',
      department_id: '6', // ทันตกรรม
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Patient Safety (S: Safe Surgery & Procedural Safety)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 1: การดูแลเฉพาะ การผ่าตัด (มาตรฐาน III-4.3)',
      risk_owner_name: 'ทพ.ภานุพงศ์ บรรลือ (หัวหน้ากลุ่มงานทันตกรรม)',
      is_never_event: 1,
      initial_likelihood: 2,
      initial_consequence: 4,
      initial_risk_score: 8,
      initial_risk_level: 'yellow',
      risk_prevention: '1. Surgical Safety Checklist ก่อน ระหว่าง และหลังทำหัตถการ (Sign In, Time Out, Sign Out)\n2. ทำ Dental X-ray ก่อนถอนหรือผ่าฟันคุดทุกครั้ง\n3. ถามยืนยันชื่อ-สกุล และตำแหน่งซี่ฟันกับผู้ป่วยซ้ำก่อนลงมีด',
      risk_transfer: 'คณะกรรมการพัฒนาคุณภาพการบริการและมาตรฐานวิชาชีพทันตกรรม',
      risk_monitor: '1. อัตราการทำหัตถการผิดคน/ผิดข้าง/ผิดตำแหน่ง = 0 ราย\n2. อัตราความสมบูรณ์ของการบันทึก Surgical Checklist (เป้าหมาย 100%)',
      risk_mitigation: 'หยุดหัตถการทันที ชี้แจงผู้ป่วยและญาติอย่างตรงไปตรงมา ดูแลรักษาบาดแผล และส่งต่อแพทย์ผู้เชี่ยวชาญหากจำเป็น',
      qi_plan: 'Dental Time-Out Board แบบมีไฟสถานะยืนยันตัวตนผู้ป่วยก่อนเริ่มกรอฟัน',
      review_frequency_months: 6,
      last_reviewed_date: new Date('2026-04-15'),
      next_review_date: new Date('2026-10-15'),
      residual_risk_level: 'green',
      status: 'monitoring',
      reviews: []
    },

    // --- 2. DEPARTMENT LEVEL RISKS (ER, IPD, IT, LAB, PHARMACY) ---
    {
      risk_code: 'ER-01',
      risk_title: 'การคัดแยกผู้ป่วยที่ห้องฉุกเฉินคลาดเคลื่อน (Under Triage / Over Triage)',
      risk_description: 'การประเมินระดับความฉุกเฉินโดยใช้ MOPH ED Triage คลาดเคลื่อนต่ำกว่าความเป็นจริง (Under Triage) ส่งผลให้ผู้ป่วยวิกฤตได้รับการรักษาล่าช้า',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'department',
      department_id: '4', // ER
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Emergency Care (E: Emergency Triage Accuracy)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 9: การคัดแยกที่ห้องฉุกเฉิน (มาตรฐาน III-1)',
      risk_owner_name: 'พว.ชัชญาภา นามนุษย์ศรี (หัวหน้ากลุ่มงานอุบัติเหตุฉุกเฉิน)',
      is_never_event: 0,
      initial_likelihood: 4,
      initial_consequence: 3,
      initial_risk_score: 12,
      initial_risk_level: 'orange',
      risk_prevention: '1. นำเกณฑ์ MOPH ED Triage ฉบับปรับปรุงมาใช้ 100%\n2. กำหนดพยาบาล Triage เฉพาะเวรที่มีประสบการณ์ผ่านการอบรม\n3. จัดทำ Red Flag Checklist สำหรับอาการเจ็บหน้าอก หายใจเหนื่อย และปวดศีรษะเฉียบพลัน',
      risk_transfer: 'ทีม PCT ฉุกเฉิน และคณะกรรมการคุณภาพโรงพยาบาล',
      risk_monitor: '1. อัตรา Under Triage ในผู้ป่วย Level 1-2 (เป้าหมาย < 1%)\n2. อุบัติการณ์ Re-triage จาก OPD มา ER\n3. สุ่มตรวจเวชระเบียนคัดแยก 30 ราย/เดือน',
      risk_mitigation: 'ปรับระดับ Triage ขึ้นทันที (Re-triage) เข้าห้อง Resuscitation รายงานแพทย์เวร และเตรียมอุปกรณ์กู้ชีพพร้อมใช้งาน',
      qi_plan: 'โครงการ Triage Smart Tablet ช่วยคำนวณระดับความฉุกเฉินตาม Vital Signs อัตโนมัติ',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-06-10'),
      next_review_date: new Date('2026-09-10'),
      residual_risk_level: 'yellow',
      status: 'open',
      reviews: [
        {
          review_date: new Date('2026-06-10'),
          review_cycle_no: 1,
          result_of_review: 'ทบทวนเคส Under triage 1 ราย อาการแรกรับปวดท้องแต่ความดันลดลงช้า จัดอบรมทบทวนเกณฑ์ MOPH ED Triage ประจำปี',
          incident_count_in_period: 1,
          current_likelihood: 2,
          current_consequence: 3,
          current_risk_score: 6,
          current_risk_level: 'yellow',
          updated_prevention: 'เพิ่มการประเมิน Shock Index (HR / SBP) ในจุดคัดแยก',
          is_escalated: 0,
          escalation_target: 'ER PCT Team',
          reviewed_by: 'พว.ชัชญาภา นามนุษย์ศรี'
        }
      ]
    },
    {
      risk_code: 'ER-02',
      risk_title: 'การรักษาซ้ำที่ห้องฉุกเฉินภายใน 48 ชั่วโมงด้วยโรคเดิมโดยไม่ได้วางแผน (Re-visit ER within 48 hrs)',
      risk_description: 'ผู้ป่วยกลับมารับการตรวจรักษาซ้ำที่ ER ภายใน 48 ชม. ด้วยภาวะแทรกซ้อน หรืออาการเดิมที่ไม่ทุเลา ซึ่งไม่ได้มาตามนัดหมาย',
      source: 'รายงานอุบัติการณ์',
      scope_level: 'department',
      department_id: '4', // ER
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Patient Safety (P: Continuity of Care)',
      essential_std: 'มาตรฐานการดูแลผู้ป่วยฉุกเฉินและการจำหน่าย (มาตรฐาน III-1)',
      risk_owner_name: 'พว.ชัชญาภา นามนุษย์ศรี (กลุ่มงานอุบัติเหตุฉุกเฉิน)',
      is_never_event: 0,
      initial_likelihood: 4,
      initial_consequence: 3,
      initial_risk_score: 12,
      initial_risk_level: 'orange',
      risk_prevention: '1. Re-assessment อาการและสัญญาณชีพก่อนจำหน่ายทุกราย\n2. จัดทำ Discharge Instruction และคำเตือน Red Flag Signs ชัดเจน\n3. นัด F/U ที่คลินิกเฉพาะทางในรายที่มีความเสี่ยงสูง',
      risk_transfer: 'คณะกรรมการ PCT และหัวหน้ากลุ่มงานการแพทย์',
      risk_monitor: '1. อัตรา Unplanned Re-visit ภายใน 48 ชม. (KPI < 1.5%)\n2. ทบทวน RCA ทุกเคสที่ Re-visit แล้วต้อง Admit',
      risk_mitigation: 'ตรวจประเมินซ้ำโดยแพทย์เฉพาะทาง/แพทย์อาวุโส พิจารณาตรวจเพิ่มเติมทางห้องปฏิบัติการ และ Admit เพื่อสังเกตอาการ',
      qi_plan: 'ระบบ SMS ส่งคำแนะนำการดูแลตนเองหลังกลับบ้านและแจ้งเตือนอาการผิดปกติ',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-05-20'),
      next_review_date: new Date('2026-08-20'),
      residual_risk_level: 'yellow',
      status: 'open',
      reviews: []
    },
    {
      risk_code: 'IT-01',
      risk_title: 'ระบบโรงพยาบาลสารสนเทศ (HOSxP / Database) ล่มหรือไม่สามารถใช้งานได้',
      risk_description: 'ระบบแม่ข่าย (Main Server) ฐานข้อมูล หรือระบบเครือข่ายขัดข้อง ส่งผลให้แพทย์ พยาบาล และห้องยาไม่สามารถคีย์ข้อมูล บันทึกเวชระเบียน หรือสั่งยาได้',
      source: 'เรื่องที่หน่วยงานให้ความสำคัญ',
      scope_level: 'department',
      department_id: '9', // ศูนย์คอมฯ / สารสนเทศ
      program_id: 4, // IT
      category_name: 'Non-Clinical Risk (ทั่วไป/สิ่งแวดล้อม)',
      safety_goal: 'System Continuity (IT System Availability & Backup)',
      essential_std: 'มาตรฐานการบริหารระบบสารสนเทศและความปลอดภัยทางไซเบอร์ (มาตรฐาน II-5)',
      risk_owner_name: 'นายณัชชาวีณ์ เสริมมติวงศ์ (หัวหน้างานเทคโนโลยีสารสนเทศ)',
      is_never_event: 0,
      initial_likelihood: 3,
      initial_consequence: 4,
      initial_risk_score: 12,
      initial_risk_level: 'orange',
      risk_prevention: '1. ระบบสำรองข้อมูลอัตโนมัติ (Automated Daily & Real-time Replication Backup)\n2. เครื่องสำรองไฟอัจฉริยะ (Smart UPS) และเครื่องสำรองไฟฟ้าฉุกเฉิน\n3. การซ้อมแผน Contingency Downtime Plan ทุก 6 เดือน\n4. ตรวจสอบอุณหภูมิและความชื้นห้อง Server ตลอด 24 ชม.',
      risk_transfer: 'คณะกรรมการบริหารโรงพยาบาล และผู้ดูแลระบบแม่ข่ายภายนอก (HOSxP Technical Support)',
      risk_monitor: '1. System Uptime (% Uptime >= 99.8%)\n2. ระยะเวลา Downtime รวมต่อปี (< 4 ชั่วโมง)\n3. ผลการทดสอบกู้คืนข้อมูล (Recovery Time Objective < 30 นาที)',
      risk_mitigation: 'ประกาศใช้แผนสำรอง HOSxP Downtime (ใช้กระดาษและฟอร์มสำรองทันที) สลับไปใช้เซิร์ฟเวอร์สำรอง (Slave Server) และแจ้ง Line Alert ให้ทุกหน่วยงานทราบ',
      qi_plan: 'การพัฒนาระบบ High Availability Cluster Server แบบ Auto-Failover ไร้รอยต่อ',
      review_frequency_months: 6,
      last_reviewed_date: new Date('2026-05-11'),
      next_review_date: new Date('2026-11-11'),
      residual_risk_level: 'green',
      status: 'monitoring',
      reviews: [
        {
          review_date: new Date('2026-05-11'),
          review_cycle_no: 1,
          result_of_review: 'ติดตั้งเครื่องสำรองไฟใหม่ 10 kVA และติดตั้งระบบแจ้งเตือนอุณหภูมิห้อง Server ผ่าน Line Notify เรียบร้อย',
          incident_count_in_period: 0,
          current_likelihood: 1,
          current_consequence: 4,
          current_risk_score: 4,
          current_risk_level: 'yellow',
          updated_prevention: 'บำรุงรักษาเครื่องปรับอากาศห้อง Server ตามตารางทุก 3 เดือน',
          is_escalated: 0,
          escalation_target: 'IT Committee',
          reviewed_by: 'นายณัชชาวีณ์ เสริมมติวงศ์'
        }
      ]
    },
    {
      risk_code: 'LAB-01',
      risk_title: 'การรายงานผลการตรวจวิเคราะห์ทางห้องปฏิบัติการผิดพลาดหรือล่าช้า (Laboratory Error)',
      risk_description: 'การออกผลตรวจเลือด/ปัสสาวะผิดคน สลับหลอดสิ่งส่งตรวจ คีย์ผลในคอมพิวเตอร์ผิด หรือการรายงานผลวิกฤต (Critical Value) ล่าช้าเกินเวลาที่กำหนด',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: 'department',
      department_id: '10', // ห้องปฏิบัติการ
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Patient Safety (P: Accurate Diagnostic Testing)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 8: การบริการตรวจวินิจฉัยและห้องปฏิบัติการ (มาตรฐาน II-7.2)',
      risk_owner_name: 'ทนพญ.จิราพร ใจชื่น (กลุ่มงานเทคนิคการแพทย์)',
      is_never_event: 0,
      initial_likelihood: 4,
      initial_consequence: 3,
      initial_risk_score: 12,
      initial_risk_level: 'orange',
      risk_prevention: '1. WI-LAB-Mn002 การรายงานผลผ่านระบบ LIS เชื่อม HOSxP โดยตรง\n2. WI-LAB-Mn004 การตรวจวิเคราะห์และการควบคุมคุณภาพ (IQC / EQAS)\n3. เกณฑ์รายงานค่าวิกฤต (Critical Value Alert) ทางโทรศัพท์ทันทีภายใน 15 นาที พร้อมจดบันทึก Read Back',
      risk_transfer: 'คณะกรรมการเทคนิคการแพทย์และสหวิชาชีพ',
      risk_monitor: '1. อัตราการรายงานผลวิกฤตทันเวลา (เป้าหมาย 100%)\n2. อัตราการรายงานผลผิดพลาด (เป้าหมาย = 0%)\n3. สุ่มสอบทานผลการตรวจซ้ำ (Repeat Testing Audit)',
      risk_mitigation: 'โทรศัพท์แจ้งแพทย์และหอผู้ป่วยทันทีเพื่อยกเลิกผลเดิม ออกใบแก้ผลที่มีแถบสีแดงเตือน และทบทวน RCA ภายใน 24 ชม.',
      qi_plan: 'ระบบ Pop-up Critical Value อัตโนมัติขึ้นที่หน้าจอแพทย์ทันทีที่เครื่องตรวจวิเคราะห์ยืนยันผล',
      review_frequency_months: 6,
      last_reviewed_date: new Date('2026-04-10'),
      next_review_date: new Date('2026-10-10'),
      residual_risk_level: 'yellow',
      status: 'open',
      reviews: []
    },
    {
      risk_code: 'IPD-01',
      risk_title: 'ผู้ป่วยเกิดแผลกดทับระดับรุนแรงในหอผู้ป่วยใน (Severe Pressure Injury / Bed Sore Stage 3-4)',
      risk_description: 'ผู้ป่วยนอนติดเตียงหรือช่วยเหลือตัวเองไม่ได้ เกิดภาวะเนื้อเยื่อขาดเลือดจนเป็นแผลกดทับระดับ 3-4 ระหว่างนอนพักรักษาตัวในหอผู้ป่วยใน',
      source: 'รายงานอุบัติการณ์',
      scope_level: 'department',
      department_id: '5', // IPD
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Nursing Excellence (N: Pressure Injury Prevention)',
      essential_std: 'มาตรฐานการพยาบาลและการดูแลผู้ป่วยเรื้อรัง (มาตรฐาน III-4.1)',
      risk_owner_name: 'พว.วราภรณ์ แสงจันทร์ (หัวหน้าหอผู้ป่วยใน IPD)',
      is_never_event: 0,
      initial_likelihood: 3,
      initial_consequence: 3,
      initial_risk_score: 9,
      initial_risk_level: 'orange',
      risk_prevention: '1. ประเมิน Braden Scale ทุกรายแรกรับและซ้ำทุกสัปดาห์\n2. พลิกตัวเปลี่ยนท่าทุก 2 ชั่วโมง พร้อมบันทึก Turning Clock\n3. ใช้ที่นอนลมป้องกันแผลกดทับในผู้ป่วยกลุ่มเสี่ยงสูง\n4. ดูแลสุขอนามัยผิวหนังและทาโลชั่นบำรุงความชุ่มชื้น',
      risk_transfer: 'ทีมนำการพยาบาล (Nursing Quality Committee)',
      risk_monitor: '1. อัตราการเกิดแผลกดทับรายใหม่ในโรงพยาบาล (เป้าหมาย < 1.0 ต่อ 1,000 วันนอน)\n2. ความสม่ำเสมอในการเปลี่ยนท่าผู้ป่วยตามตาราง',
      risk_mitigation: 'ทำแผลด้วยเทคนิคปลอดเชื้อ ใช้ Advanced Dressing ประเมินขนาดแผลทุกสัปดาห์ และปรึกษาโภชนากรเสริมโปรตีน',
      qi_plan: 'นวัตกรรมเบาะรองพลิกตัวลดแรงเสียดทานและผ้ายกตัว Smart Turn',
      review_frequency_months: 3,
      last_reviewed_date: new Date('2026-06-25'),
      next_review_date: new Date('2026-09-25'),
      residual_risk_level: 'green',
      status: 'open',
      reviews: []
    }
  ];

  for (const r of risks) {
    const { reviews, ...riskData } = r;
    const createdRisk = await prisma.riskanalysis.create({
      data: {
        ...riskData,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });

    if (reviews && reviews.length > 0) {
      for (const rev of reviews) {
        await prisma.riskanalysis_review.create({
          data: {
            ...rev,
            risk_analysis_id: createdRisk.id,
            created_at: new Date()
          }
        });
      }
    }
  }

  console.log(`Successfully seeded ${risks.length} riskanalysis records with full HA standard attributes!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
