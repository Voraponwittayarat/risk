# RiskHRMS Current Status

อัปเดต: 1 ตุลาคม 2569

## สถานะล่าสุด

### Risk Register: ปรับหน้าใช้งานตามทะเบียนอ้างอิง (1 ตุลาคม 2569)

- ขอบเขตรอบนี้: ภาพรวมอ่านง่าย, คะแนนตั้งต้นเทียบหลังทบทวน, แยกวันครบกำหนด โดยคงตารางเต็ม/พิมพ์/CSV และสิทธิ์เดิม
- เพิ่มภาพรวม 5 คอลัมน์เป็นค่าเริ่มต้น กดชื่อเรื่องเปิดรายละเอียดและประวัติ RCA/CAPA หรือกดทบทวนตามสิทธิ์เดิม
- หากไม่มีคะแนนหลังทบทวน แสดง “ยังไม่ประเมินความเสี่ยงคงเหลือ”; การเปลี่ยนคะแนนเทียบตั้งต้น ไม่ใช่แนวโน้มระหว่างรอบ
- แยกเกินกำหนด/วันนี้/ภายใน 30 วัน/วันในอนาคต/ยังไม่กำหนดวัน โดยนับวันตาม Asia/Bangkok
- งานถัดไป: จัดผลทบทวนและหลักฐานประสิทธิผล, สรุป CAPA ในภาพรวม, ออกแบบหัวข้อความเสี่ยงสัมพันธ์หลายรหัส NRLS พร้อมป้องกันนับซ้ำ ต้องตรวจสัญญา API และข้อมูลก่อนขยาย
- ข้อมูลอ้างอิงเดิมบางช่อง Residual ใช้ระดับอุบัติการณ์: ยังไม่แปลงข้อมูลหรือเปลี่ยนเกณฑ์อัตโนมัติ
- สาขางาน `codex/risk-register-overview`; แยก commit เฉพาะงานนี้จากงาน medication import และไฟล์เดิมที่ยังไม่ commit
- ไม่มีการแก้ schema/migration/ฐานข้อมูล และไม่มีการ deploy; backup, running commit และ production health ไม่ได้ตรวจในรอบนี้
- ตรวจผ่าน: `npm run build` ทั้ง frontend/backend; `node --test src/utils/riskReviewDue.test.mjs` 3 tests; `git diff --check` (frontend มีคำเตือน bundle ใหญ่)
- อัปโหลด commit งาน `39757daf` ไป GitHub `riskwangchao/HRMS2026` branch `codex/risk-register-overview` สำเร็จแล้ว หลังผู้ใช้ยืนยันสิทธิ์และตรวจ AGENTS.md; งานเดิมที่ยังไม่ commit ไม่รวมในการอัปโหลดนี้
- ยังไม่ merge main เพราะ main ทำให้ production deploy อัตโนมัติ
- ยังไม่ได้ทดสอบ UI ผ่านเบราว์เซอร์หรือพิมพ์จริง: ก่อน release ให้ตรวจสลับภาพรวม/เต็ม, เปิดรายละเอียด/ทบทวนด้วยสิทธิ์หัวหน้างานและ RM, print preview และ CSV
- ไฟล์งานนี้: `CURRENT_STATUS.md`, `frontend/src/pages/Reports.tsx`, `frontend/src/components/RiskRegisterOverview.tsx`, `frontend/src/utils/riskReviewDue.ts`, `frontend/src/utils/riskReviewDue.test.mjs`

- ช่องเหตุผล/คำแนะนำในหน้าต่างยืนยันแสดงเฉพาะเมื่อเลือกส่งกลับแก้ไข และต้องกดยืนยันส่งกลับอีกครั้งหลังกรอก; ยืนยันปกติไม่ต้องกรอกหมายเหตุ

- หน้าต่างยืนยันแสดงรายละเอียดเหตุการณ์และระดับเดิมของผู้รายงาน พร้อมจำกัดระดับตาม NRLS: Clinical A–I / General 1–5; ระดับที่ไม่ตรงประเภทต้องตรวจสอบใหม่ ไม่มีการแปลงระดับอัตโนมัติ

- งาน RCA, CAPA, Risk Register และ performance fixes รวมอยู่ใน branch นี้แล้ว
- หน้า `/incidents/pending` ป้องกัน race ระหว่างคำขอ, ส่ง token ตั้งแต่คำขอแรก และแสดงข้อผิดพลาดแยกจากสถานะไม่มีรายการ
- รายการ incident ที่เรียงตาม ID ใช้ `skip/take` และ `count` ที่ฐานข้อมูล แทนการอ่านทุกแถวมาเรียงใน Node.js
- Dashboard ใช้ข้อมูลสรุปแบบจำกัดจำนวน และหน้า RCA ใช้ count สำหรับยอดที่ต้องแสดง
- production ที่ตรวจล่าสุดยังรัน `cf01a1dc`; ยังไม่ได้ deploy การแก้ไขชุดนี้

## การตรวจสอบ

- `npm run build` frontend ผ่าน
- `npm run build` backend ผ่าน
- backend Jest ชุด incidents ผ่าน 72 tests ในรอบตรวจ performance และชุดรวมก่อนหน้า 189 tests ผ่าน
- production health ตอบ HTTP 200 ประมาณ 0.006 วินาที ณ เวลาตรวจ; RAM available ประมาณ 13.9 GB และ service ไม่มี restart

## ข้อจำกัด

- ยังไม่ได้ทำ MariaDB integration test ของ migration RCA
- ยังมี endpoint รายงานบางตัวที่อ่านข้อมูลช่วงกว้างเพื่อคำนวณ matrix ซึ่งควรทำ aggregate/pagination เมื่อข้อมูลเพิ่ม
- ต้อง backup และใช้ `prisma migrate deploy` ก่อน release production ตาม runbook
