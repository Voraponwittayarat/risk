# RiskHRMS Current Status

อัปเดต: 1 ตุลาคม 2569

## สถานะล่าสุด

### Risk Register: ปรับตามคู่มือ PDF (รอบที่ 2)

- อ้างอิง: [คู่มือ risk register.pdf](https://drive.google.com/file/d/1J_AEZLjq24IJDoxEwfLptOvPu50OLqVm/view) ตามที่ผู้ใช้อนุมัติ ใช้เป็นแนวทาง UX ไม่เปลี่ยนเกณฑ์คลินิกหรือข้อมูลเดิมอัตโนมัติ
- แยก Process, Results และสาเหตุ/RCA ในแบบฟอร์มทบทวน แล้วบันทึกรวมแบบมีหัวข้อใน `result_of_review` เดิม ประวัติและ CSV ยังอ่านได้
- แสดงแผน Monitor ให้เทียบกับผลที่พบจริง พร้อมคำแนะนำอ้างอิง RCA/CAPA และรวม QI ที่พิสูจน์ผลแล้วในมาตรการ
- ย้ายช่องวันที่จากแบบฟอร์มสร้างทะเบียนมาแบบฟอร์มทบทวน ตรวจลำดับวันที่ ตั้งรอบแรกย้อนหลัง 1 ปี รอบถัดไปเริ่มจากวันทบทวนล่าสุด (ผู้ใช้ตรวจแก้ได้); ระบบนับ NRLS ยังคง cutover เดิม
- เริ่มคะแนน/มาตรการจากรอบล่าสุดเมื่อมีข้อมูล และ reset การตัดสินใจ/หลักฐานทุกครั้งที่เปิดแบบฟอร์ม ไม่แสดงจำนวน 0 เสมือนคำนวณแล้วก่อนบันทึก
- ประวัติทบทวนแสดงหลักฐานประสิทธิผลจาก snapshot เดิม รองรับ snapshot เก่า/เสียโดยไม่ทำให้หน้าล่ม
- แสดงคำเตือน Never Event แยกจากคะแนน L×C; ชี้แจง `closed` เดิมว่าปิดแบบเฝ้าระวังและยังมีนัด ไม่ใช่ยุติติดตามตามคู่มือ
- ข้อจำกัด/งานต่อ: สถานะ Closed ที่ยุติการติดตามจริงและระดับความสำคัญขององค์กรยังต้องออกแบบ API/เงื่อนไขสิทธิ์/การจัดการข้อมูลเดิม; รอบนี้ไม่มี schema migration หรือแก้ฐานข้อมูล
- ไฟล์รอบนี้: `Reports.tsx`, `RiskRegisterOverview.tsx`, `riskReviewGuide.ts`, `riskReviewGuide.test.mjs`, `CURRENT_STATUS.md`
- ไม่ deploy: backup/running commit/production health ไม่ได้ตรวจ; ต้องตรวจ UI ของหัวหน้างาน/RM และ print preview ก่อน release
- ตรวจผ่าน: build frontend/backend, unit tests 6 รายการ (วันครบกำหนด/เนื้อหาทบทวน/snapshot เก่า/ช่วงวันที่และปีอธิกสุรทิน), `git diff --check`; frontend มีคำเตือน bundle ใหญ่ ยังไม่ได้ตรวจ UI ผ่านเบราว์เซอร์จริง
- ส่งชุดนี้ผ่าน GitHub branch `codex/risk-register-guide` เนื่องจาก workspace เปลี่ยนเป็น `codex/unified-incident-review` ระหว่างงาน; commit เฉพาะไฟล์รอบนี้ ไม่รวมงานยาและงาน RCA ที่ยังไม่ commit

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


## 2 ตุลาคม 2569 — รวมการตัดสินใจในหน้าทบทวนความเสี่ยง

- แสดงช่องสาเหตุที่พบจากการทบทวนของหน่วยงานทุกระดับ รวม A/B/1; ตรวจด้วยข้อมูลจำลองว่าบันทึก cause_problem และแสดงในสรุปได้ ส่วนส่งศูนย์ RCA ใช้เหตุผลส่งต่อ
- หน้ารายการเหลือทางเข้าหน้าทบทวน ย้ายปุ่ม Mini RCA ด่วนและทางเลือก RCA มาที่หน้าทบทวน
- ลดแนวทางหลักเหลือทบทวนในหน่วยงาน/ส่งศูนย์ RCA; ผลติดตามต่อหรือยุติปัญหาได้อยู่ในฟอร์ม และปุ่มจำหน่ายแสดงเฉพาะเมื่อเลือกยุติปัญหาได้ เครื่องมือ Mini เปิดจากส่วนหน่วยงานที่พับไว้ และ Standard อยู่เฉพาะทางส่งศูนย์ RCA; เอา Concise ออกจากหน้ารายเหตุการณ์ ให้เริ่มจากเลือกหลายรายการในหน้ารายการ
- ส่งศูนย์โดยตรงขอเหตุผล 10–2000 ตัวอักษร ไม่บังคับ contributing factors หรือมาตรการ ไม่สร้าง riskreview สมมติ; เก็บผู้ส่งและเหตุผลใน workflow audit และสร้าง Standard RCA สถานะ PENDING
- หน้าสรุปเหลือกลับไปแก้ไขการทบทวนและทบทวนเรื่องอื่นต่อ เก็บข้อความเดิมในฟอร์ม; การบันทึกแก้ไขเป็นรอบใหม่เพื่อเก็บประวัติเดิม เมื่อจำหน่ายแล้วปิดทางแก้ไขจากหน้าสรุป
- ป้องกันสร้าง Mini/Concise ก่อนยืนยันหรือหลังปิดเคส และป้องกันลดชนิด RCA จากเกณฑ์ Standard/Full; แสดงว่า Mini ที่บันทึกยังอยู่ระหว่างดำเนินการ
- ไม่เปลี่ยน schema/migration และไม่แก้ข้อมูลจริง ไม่ deploy; backup/running commit/production health ไม่ได้ตรวจในรอบนี้
- ตรวจ browser ด้วย API จำลองและข้อมูลสมมติบน localhost: ส่งตรงโดยไม่มีปัจจัย/มาตรการ, สรุปผลและกลับไปแก้ไข, บันทึกทบทวนพร้อมจำหน่ายจากสถานะยืนยันแล้วระดับ A
- ไฟล์: IncidentDetail, IncidentList, MiniRcaModal, incidents.controller/service/spec, rca.service/spec และเอกสารสถานะ/การตัดสินใจ/TODO
- งานต่อ: ตรวจบัญชีจริงบน staging และอนุมัติ release ตาม pipeline; Mini/Concise เดิมเปิดรายการเพื่อดู โดยยังไม่เพิ่มการเขียนทับมาตรการเดิม
- ตรวจผ่าน: npm run build ทั้ง frontend/backend, backend tests 113 รายการ (incidents.service, rca.service, rca-discharge), git diff --check; frontend ยังมีคำเตือน bundle ใหญ่เดิม
