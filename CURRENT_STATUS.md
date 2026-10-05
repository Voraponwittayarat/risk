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
## 2 ตุลาคม 2569 — เตรียม release หน้าทบทวน RCA หน่วยงาน

- Mini RCA แสดงในหน้าทบทวนโดยตรง ซ่อนแบบกรอกสาเหตุ/มาตรการปกติระหว่างใช้เครื่องมือ และเอาข้อมูลเหตุการณ์ซ้ำออก
- เลือกปัจจัย NRLS และกรอกข้อค้นพบภายใน Swiss Cheese ข้อ 1–4; นโยบายและการสื่อสารอยู่ข้อ 1, กำกับดูแลอยู่ข้อ 2, หมวดอื่นอยู่ข้อ 3
- รวมช่อง CMP ในข้อ 4 และใช้ข้อความเดียวกันในข้อมูลมาตรการ; หน่วยงานของรายงานถูกใช้โดยอัตโนมัติในหน้าหน่วยงาน
- ปุ่มสถานะใช้ชื่อรอทำ RCA หน่วยงาน; เมนูใช้ติดตามความเสี่ยง Risk register
- ไม่มี schema/migration ใหม่และไม่แก้ข้อมูลจริง งานนำเข้าความเสี่ยงด้านยายังแยกอยู่นอก release นี้
- Deploy สำเร็จ 2 ต.ค. 2569 เวลา 13:30 น. (ไทย): running/main commit 4daf349cd12c1ca9dc0bc004b9aba0f414bf8b04, service active, health ok/database connected
- Backup ของ updater: /var/backups/riskhrms/riskhrms-db-20261002T062859Z.sql; SHA-256 509726b58ef456f76346d8cbee1a0b866103fafe9c87a10d9e95804c25bd624c; ไม่มี pending migration
- Archive stale auto-deploy block ที่เกิดก่อน deploy สำเร็จรอบเดิม หลังตรวจว่า commit/state ตรงกันและ health ปกติ แล้วให้ poller เรียก updater ตาม pipeline
- Backend tests 113 ผ่าน; updater build frontend/backend ผ่าน; ทดลอง login, เปิดรายการและรายละเอียดแบบอ่านอย่างเดียว, ตรวจชื่อเมนู Risk register/ปุ่มรอ RCA/ทางเข้าเครื่องมือ โดยไม่บันทึกเหตุการณ์จริง เครื่องมือในเรื่องที่ตรวจถูกปิดตามสิทธิ/เงื่อนไข จึงไม่ได้ทดลองบันทึก RCA จริง

### Risk register workspace — 2 ตุลาคม 2569

- รวมแนวโน้มและงานติดตามเป็นมุมมองหลัก ลดพื้นที่ส่วนหัว สลับขั้นตอนทะเบียนความเสี่ยง/ติดตามมาตรการ
- ล็อกส่วนระบุความเสี่ยงและรายละเอียด ปรับสีตารางให้อ่อนและแยกกลุ่มชัดเจน ลบแถบข้อมูลผู้ใช้ซ้ำ
- frontend/backend build ผ่าน ตรวจหน้าเดสก์ท็อปและจอแคบแล้ว ไม่มี schema migration หรือการแก้ข้อมูลจริง
- เตรียม release ผ่าน GitHub main และ production poller; backup /var/backups/riskhrms/riskhrms-db-20261002T113111Z.sql

## Medication import release — 2 ตุลาคม 2569

- ผู้ใช้สั่ง Deploy ฟีเจอร์นำเข้า Medication CSV สำหรับ admin และ rm_committee ขอบเขต hospital
- เตรียมใน codex/medication-import-release จาก origin/main (18496b08) เพื่อไม่รวมงาน RCA และ migration อื่นจาก workspace หลัก
- API ตรวจสิทธิ์ context/preview/commit; Admin ข้ามหน่วยงานได้เฉพาะ trusted medication importer ส่วนรายงานทั่วไปยังจำกัดหน่วยงานเดิม
- เพิ่ม Vite proxy /medication-import สำหรับ dev; production ใช้ same origin ตามเดิม
- ไม่เปลี่ยน schema และไม่มี migration; ไม่ทดลองนำเข้ารายการจริง
- ไฟล์: importer controller/service/parser และ tests, incidents module/service/test, App, Layout, MedicationImport, vite.config.ts, คู่มือนำเข้า และ CURRENT_STATUS.md
- รอข้อมูล SSH production เพื่อรัน backup-hrms.sh และตรวจ dump/SHA-256 ก่อน push main; ยังไม่ deploy ไม่ทราบ running commit/health และยังไม่มี backup path ของรอบนี้
- หลัง deploy ต้องตรวจ health, login, incident list แบบอ่านอย่างเดียว และหน้า/API นำเข้าตามบทบาท
- Validation: frontend/backend builds passed; backend tests 27 suites / 223 tests passed; frontend bundle-size warning only.
- Release workspace deploy สำเร็จ: 18496b08df4ee29776bce5144e8c2067176e8ba6; health ok/database connected; production frontend/backend build ผ่าน
- Updater backup /var/backups/riskhrms/riskhrms-db-20261002T113618Z.sql SHA-256 0d835cf994e9f71950ff80f065cffc3dfcb4a05d72cf13d2ff2fbeabf03e07ae ตรวจแล้ว; ตรวจหน้า Reports และ incident list แบบอ่านอย่างเดียวผ่าน

### ศูนย์ RCA รพ. และนัดหมาย (งานใหม่ ยังไม่ deploy)

- เรื่องส่งเข้าศูนย์ระบุ hospital_center; ทีม RM/PCT เห็นและจัดทีม/นัดได้ ไม่เพิ่มสิทธิ์อนุมัติสรุปหรือข้อมูลสัมภาษณ์
- นัดเลือกผู้ร่วมทบทวนที่บันทึกแล้ว พร้อม snapshot รายชื่อ วันเวลา สถานที่ และสถานะส่ง Telegram
- ใช้ Bot/กลุ่มเดียวกับ E/3 และเพิ่ม toggle ในตั้งค่าแจ้งเตือน ส่งเฉพาะข้อมูลนัดกับลิงก์ ไม่ส่งรายละเอียดเหตุการณ์/รายชื่อ
- ทดสอบ backend ทั้งหมดผ่าน 28 suites / 228 tests; มี migration ใหม่ 20261002120000_rca_center_appointments ยังไม่ได้รันกับฐานข้อมูลจริง

- ชุดนัด RCA build frontend/backend ผ่าน; แก้ routing ของ preview แล้ว ตรวจและแคปรายการศูนย์ RCA/ช่องผู้ร่วม วันเวลา สถานที่ ด้วยข้อมูลสมมติแล้ว (ไม่มีการส่ง Telegram จริง)

### Actual Impact ใน RCA — 2 ตุลาคม 2569

- หยุดนำ problem_basic ไปเติม actual_impact เมื่อส่งเข้าศูนย์ RCA ทั้งสองเส้นทาง ให้ผู้ทบทวนระบุผลกระทบจริง
- อธิบายผลกระทบจริงแยกจากการจัดการแก้ไข; เอกสารเก่าที่ข้อความตรงกับข้อมูลรายงาน/การแก้ไขเบื้องต้นแสดงคำเตือน โดยคงข้อความเดิมไว้ให้ตรวจ
- ไม่มี schema/migration เพิ่มจากการแก้นี้ และไม่แก้ข้อมูลจริง; ยังไม่ได้ deploy ชุดแก้ Actual Impact

- ตรวจผ่าน: frontend/backend npm run build และ regression 2 suites / 110 tests; git diff --check ผ่าน

### Timeline RCA: กรอกตารางและภาพสรุป — 2 ตุลาคม 2569

- เปลี่ยนช่องกรอกเป็นตารางแถวติดกัน ลด padding และรวมคอลัมน์วันที่/เวลา/เหตุการณ์/จุดวิกฤต
- วางหลายเซลล์จาก Excel ลงช่องเหตุการณ์หรือช่องนำเข้า เห็น preview ทันทีและเพิ่มแถวโดยเก็บข้อมูลเดิม รองรับ 2–4 คอลัมน์ วันที่ พ.ศ./ค.ศ. และข้อความหลายบรรทัด
- ภาพสรุปแบบเส้นแนวนอน สลับเหตุการณ์บน/ล่าง แสดงวันเวลาและจำนวนจุดวิกฤต สีแดงใช้เฉพาะจุดวิกฤต ระยะห่างสื่อเฉพาะลำดับแถว ไม่ใช่ระยะเวลาจริง
- ไม่มี schema/migration ใหม่ ไม่แก้ข้อมูลจริง และยังไม่ deploy ชุดนี้

- ตรวจผ่าน: frontend/backend build, parser tests 4 ข้อ, วางแบบ 2 คอลัมน์และวางลงเซลล์โดยตรงใน browser; แถวเดิม 5 แถวเพิ่มเป็น 7 โดยไม่ทับข้อมูล ภาพสรุปอัปเดต 7 เหตุการณ์/1 จุดวิกฤต

### ยกเลิกช่อง 5 Whys — 2 ตุลาคม 2569

- เอาช่อง 5 Whys และตัวเลือกนำเข้า 5 Whys จากผู้ช่วย AI ออกจากหน้า RCA เปลี่ยนชื่อเครื่องมือเพิ่มเติมให้เหลือวิเคราะห์แนวป้องกัน Swiss Cheese
- ไม่ส่ง whys ใน payload ใหม่ จึงไม่ลบข้อมูลเก่าตอนบันทึก; ไม่มี schema/migration และไม่แก้ข้อมูลจริง ชุดนี้ยังไม่ deploy

- ตรวจผ่าน: frontend/backend `npm run build` และ `git diff --check`; frontend มีคำเตือน bundle ใหญ่เดิม

### ส่งออกรายงาน RCA — 2 ตุลาคม 2569

- เพิ่ม RcaReportExport และ rcaReport: แบบฟอร์มรายงานแยกจาก UI ตามโครงสร้างตัวอย่างขั้นต่ำปี 2569 รองรับ Timeline, CMP, ตารางกระบวนการ/ปัจจัย 5 ระดับ, มาตรการ, ผู้ร่วมทบทวน และสัมภาษณ์เมื่อมีข้อมูล/มีสิทธิ์
- เลือกส่วนรายงานได้จาก preview; ซ่อนส่วน/แถว/คอลัมน์ว่าง รวมถึง CAPA ที่มีเพียงวันตั้งต้น ไม่มีลูกศร details ปุ่มหรือกรอบแอปในเนื้อหารายงาน; escape ข้อความทั้งหมด
- Word เป็น .doc แบบ HTML ที่เปิดแก้ไขใน Word ได้; PDF ผ่าน browser print เลือก Save as PDF (ไม่ได้ดาวน์โหลด PDF อัตโนมัติ) ใช้ข้อมูลในฟอร์มปัจจุบันและเตือนเมื่อยังไม่บันทึก
- ตรวจ frontend/backend build ผ่าน, unit tests รายงาน 4 ข้อ, browser preview และการตัดส่วนที่ไม่เลือกผ่าน; IAB ไม่ส่ง download event และไม่สามารถตรวจหน้าพิมพ์ระบบได้ จึงยังต้องตรวจเปิด .doc ใน Word และบันทึก PDF ด้วย Chrome/Edge จริงก่อน release
- ไม่มี schema/migration ไม่แก้ข้อมูลจริงและยังไม่ deploy; ไม่มี backup/health-check รอบนี้

### รูปแบบรายงาน RCA ทางการ — 2 ตุลาคม 2569

- ใช้โลโก้เดียวกับรายงาน HA พร้อมชื่อโรงพยาบาล รหัส RM-RCA-FM-01 และเลขอ้างอิง; เนื้อหาและตารางใช้ TH SarabunPSK 14pt บรรจุฟอนต์ regular/bold พร้อม license จากต้นฉบับ ไม่แก้ไฟล์ฟอนต์
- โหลดฟอนต์/โลโก้เมื่อเปิดรายงานเท่านั้น เพื่อลดภาระการโหลดหน้าอื่น; รอ fonts.ready ก่อนพิมพ์ PDF
- Timeline รวมวันที่ซ้ำเฉพาะแถวต่อเนื่องด้วย rowspan ไม่เรียงเหตุการณ์ใหม่ ไม่รวมข้ามแถวไม่ทราบวันที่
- Word .doc ใช้ MHTML บรรจุโลโก้ไว้ภายในเพื่อเปิดแบบออฟไลน์; Word ใช้ TH SarabunPSK ที่ติดตั้งในเครื่อง ส่วน PDF ฝัง web font ในรายงาน
- Unit tests รายงาน 6 ข้อผ่าน; ไม่มี schema/migration/ข้อมูลจริง และยังไม่ deploy

- ตรวจ frontend/backend build ผ่าน, browser ยืนยัน TH SarabunPSK 18.6667px (=14pt), fonts loaded และวันที่กลุ่ม 4/1 แถวถูกต้อง; ยังไม่ตรวจไฟล์จริงใน Word/Chrome print dialog (ข้อจำกัดเดิม)

### หัวรายงานและแผนภูมิ Timeline RCA — 2 ตุลาคม 2569

- เน้นหัวกลางกระดาษ “แบบบันทึกการวิเคราะห์ RCA” 18pt ตัวหนา และชื่อโรงพยาบาลวังเจ้า 14pt ใต้หัวข้อ คงโลโก้/รหัสเอกสารเดิม
- เพิ่มส่วนเลือกส่งออกแผนภูมิ Timeline จากเหตุการณ์ที่กรอก แสดงซ้าย–ขวาตามลำดับ วันที่ต่อเนื่องแสดงครั้งเดียว จุดวิกฤตสีแดง ไม่สร้างข้อสรุปสาเหตุอัตโนมัติ ใช้ HTML ตารางให้ Word/PDF ใช้ข้อมูลเดียวกัน
- ตรวจ frontend/backend build, unit tests รายงาน 7 ข้อ และ browser preview 5 เหตุการณ์/2 วัน/1 จุดวิกฤตผ่าน; ยังต้องตรวจไฟล์ Word และการแบ่งหน้า PDF ใน browser จริงตามข้อจำกัดเดิม
- ไม่มี migration/ผลกระทบฐานข้อมูล ไม่ deploy จึงไม่มี backup/running commit/health check รอบนี้

### แถบปุ่มด้านล่าง Standard RCA — 3 ตุลาคม 2569

- ย้ายปุ่มทบทวนแล้วไม่ต้องทำ RCA/จำหน่ายเคสจากหัวหน้าไปแถบด้านล่าง คงสิทธิ์ เงื่อนไขสถานะ และ handler เดิม
- เปลี่ยนแถบล่างจากสีดำเป็นเขียวอมฟ้าอ่อน ปรับสีปุ่ม/ข้อความให้ชัด และให้กลุ่มปุ่มตัดบรรทัดเมื่อพื้นที่ไม่พอ
- ตรวจ frontend/backend build และ git diff check ผ่าน; browser ยืนยันปุ่มอยู่ใน section แถบล่างสีอ่อน ไม่กดจำหน่ายหรือแก้ข้อมูลจริง
- ไม่มี migration/ผลกระทบฐานข้อมูล และยังไม่ deploy จึงไม่มี backup/running commit/health check รอบนี้

## Release RCA — 4 ตุลาคม 2569

- ผู้ดูแลอนุมัติ deploy รวมงาน RCA กับ origin/main ซึ่งมี Medication import release 65e77fea แล้ว โดยรักษางานยาไว้
- ชุดงาน: ศูนย์ RCA รพ./สิทธิ์ RM-PCT/นัด Telegram ส่วนกลาง, แยก Actual Impact, Timeline รับ Excel และภาพสรุป, ถอด 5 Whys, รายงาน Word/PDF แบบเลือกข้อมูลพร้อมโลโก้ TH Sarabun และแผนภูมิ Timeline, ย้ายปุ่มจำหน่ายลงแถบล่างสีอ่อน
- Review migration 20261002120000_rca_center_appointments: เพิ่ม hospital_center และตารางนัดหมาย; ไม่ลบ incident หรือผล RCA เดิม
- Backup ก่อน release: /var/backups/riskhrms/riskhrms-db-20261004T020403Z.sql; SHA-256 a51134ec3bf95dfb324492dd4d4752e7c5705c3a5d2e23e023f685c4248d414f ตรวจไฟล์และ checksum แล้ว
- Production ก่อน release: commit 65e77feae1a7a3362cab2aaa3f8ffbad6697037b; service/timer active; health ok/database connected
- ปล่อยผ่าน GitHub main ให้ poller เรียก update-hrms.sh ซึ่งสำรองซ้ำและ migrate deploy ตามขั้นตอน; ตรวจผลหลัง deploy โดยไม่แก้ clinical records/ไม่ส่ง Telegram ทดสอบเข้ากลุ่มจริง
- ติดตามหลัง release: ตรวจรายงานยาว/การแบ่งหน้า Word และ Chrome PDF กับผู้ใช้งาน; ไม่มีฐานข้อมูลทดสอบ MariaDB ในเครื่อง development สำหรับทดลอง migration แยก
- Validation ชุดรวม: frontend/backend npm run build ผ่าน; Prisma validate/generate ผ่าน; backend 28 suites / 231 tests ผ่าน; Timeline/report 11 tests ผ่าน; git diff check ผ่าน; production case id varchar(50)/utf8mb4_unicode_ci ตรงกับ foreign key migration

### Post-deploy RCA autosave safeguard — 4 ต.ค. 2569
- Release 4491b386 deploy/migration สำเร็จ; backup /var/backups/riskhrms/riskhrms-db-20261004T022942Z.sql SHA-256 d3f690f7c8e97f733c37f6f6cd5e33dedf2777c07a803a1561007e25c6c0c8fe; health ok/database connected
- Smoke test พบ collaboration-options โหลดช้าทำให้เปลี่ยน owner placeholder ของเคสเดิม แล้วกระตุ้น autosave ทั้งที่ไม่ได้แก้ไข; จำกัดการเติมชื่อเจ้าของอัตโนมัติไว้เฉพาะเคสใหม่
- Synthetic browser regression: delayed options 3s และรอเกินรอบ 20s ไม่เกิด PATCH/ไม่มี unsaved warning; แก้ Actual Impact แล้วเกิด PATCH 1 ครั้ง บันทึกสำเร็จและ warning หาย; build frontend/backend ผ่าน
- ไม่ทดลองแก้ข้อมูล clinical เพื่อทดสอบ; ระหว่าง smoke test ก่อน patch มี autosave error จากการเปิดแบบฟอร์ม จึงปิดหน้าและทดสอบต่อด้วยเคสสมมติ

## 4 ตุลาคม 2569 — ตัวช่วย Timeline จากหลักฐาน และแก้บั๊ก RCA assistant (development)

- Standard RCA เปลี่ยนปุ่มเป็น “ช่วยจัด Timeline จากข้อมูล” อ่านข้อความ/ตาราง Excel ใน browser เท่านั้น ไม่เรียกบริการ AI ภายนอก เก็บข้อความต้นฉบับไว้เทียบในหน้าตรวจนำเข้า รองรับวันที่ พ.ศ./ค.ศ. เลขไทย และเวลา 08:30/08.30
- ไม่เติมวันที่จากวันที่เกิดเหตุโดยปริยาย ไม่สร้างเวลา ผลกระทบ หรือจุดวิกฤต ข้อมูลไม่มีวัน/เวลา หลายเวลา วันเวลาขัดแย้ง หรือย้อนลำดับจะแสดงข้อสังเกตและต้องเลือกเอง
- ตรวจ/แก้ตัวอย่างและยืนยันก่อนนำเข้า เพิ่มต่อท้ายเป็นค่าเริ่มต้น; แทนที่ต้องเลือกและยืนยันชัดเจน ย้อนกลับได้เฉพาะเมื่อไม่มีการแก้ Timeline ต่อหลังนำเข้า หลักฐานใช้ตรวจในหน้าต่างนำเข้า ยังไม่เพิ่ม schema สำหรับเก็บ provenance ถาวร
- ลบ template สำรองของ backend ที่แต่งเวลา การรักษา การวินิจฉัย ผลกระทบ และ CAPA; AI ปิด/ล้มเหลวตอบข้อผิดพลาดแทนการสร้างข้อมูลสมมติ จำกัดข้อความ 4,000 ตัวอักษรต่อช่อง แสดงข้อผิดพลาดแทนตัดเงียบ จำกัด provider พร้อมกัน 2 งาน/instance และ timeout 45 วินาที
- Mini RCA เคารพหัวข้อที่เลือกและเพิ่มข้อมูลต่อจากเดิม; Swiss Cheese ใช้ org/supervision/precondition/act; ค่าจุดวิกฤตรับ boolean true เท่านั้น
- Modal AI ยกเลิก request เมื่อปิด ป้องกัน response เก่าทับผลใหม่ จำกัดเวลา client 50 วินาที ไม่ log Axios/provider payload เปิดนำเข้าหลังเลือกหัวข้อและยืนยันตรวจแล้ว แสดงข้อผิดพลาดและปุ่มเลือกวิเคราะห์ใหม่ทั้งพื้นฐาน/เจาะลึก
- Validation: frontend/backend build ผ่าน; backend 29 suites / 244 tests; Timeline extraction/Excel 10 tests ผ่าน; synthetic browser ตรวจ append 5→6, replace 5→1, undo กลับ 5 และปิด import จนกดยืนยัน
- ไม่มี migration หรือแก้ clinical records, secrets, production services รอบนี้ยังไม่ deploy; production commit ล่าสุดที่ตรวจยืนยันก่อนรอบนี้คือ 539f00a6 ไม่ได้ตรวจ health ซ้ำในรอบพัฒนา
- ข้อจำกัด: ข้อความยาวหลายเหตุการณ์/หลายเวลาในบรรทัดเดียวต้องตรวจและแยกเอง; ยังไม่เรียก AI ภายนอกทดสอบด้วยข้อมูลจริง; API AI เดิมตรวจ incident_id บทบาทผู้ทบทวน ขอบเขตหน่วยงาน และสถานะยืนยันแล้ว/ยังเปิดก่อนประมวลผล

## 4 ตุลาคม 2569 — Timeline ตารางเรียบตามหน้าตัวอย่าง localhost:3001

- ปรับ `frontend/src/components/rca/TimelineEditor.tsx`: วันที่/เวลาอยู่คอลัมน์ซ้าย รายละเอียดเหตุการณ์ใช้พื้นที่หลัก ตัดคอลัมน์ลำดับและคอลัมน์จุดวิกฤตแยก โดยย้าย checkbox ไปใต้ข้อความ ใช้สีอ่อนและเส้นแบ่งแถว ช่องกรอกแสดงกรอบเฉพาะเมื่อ focus และ textarea ขยายตามข้อความ
- เพิ่มซ่อน/แสดงตารางโดยไม่ล้างข้อมูล ปุ่มเพิ่มขั้นตอนเปิดตารางกลับให้อัตโนมัติ คงตัวช่วย Timeline, Excel paste, preview และแผนภูมิสีเดิม
- Validation: frontend/backend build ผ่าน; synthetic UI ตรวจกรอกข้อมูลเดิม, hide→add ไม่ทำข้อมูลหาย, Excel preview/import 5→7 และวันที่แถวใหม่ถูกต้อง; responsive 543×676 ตาราง clientWidth = scrollWidth = 462px ไม่มี horizontal overflow
- ไม่มี architecture/schema/API/migration ใหม่ ไม่เปลี่ยน production data หรือ deploy รอบนี้; ไม่ได้ตรวจ production health ซ้ำ Backup ไม่เกี่ยวข้องเพราะยังไม่ update production
- ภาพและหน้าทดลองใช้ข้อมูลสมมติ: tmp/rca-preview/timeline-simple-mobile-20261004.png และ timeline-simple-desktop-20261004.png; localhost:3001 เป็น reference เท่านั้น ไม่ได้แก้ application ที่อยู่พอร์ตนั้น

## ปรับตารางนำเข้ายา — 4 ตุลาคม 2569

- Branch: codex/medication-import-table จาก origin/main ล่าสุด โดยใช้ worktree release เดิม รักษางานค้างใน workspace หลัก
- ย้ายเมนูไป ระบบ & กำหนดสิทธิ์; ตาราง CSV เดิมคู่ข้อมูลนำเข้าตรึงด้านขวา, อ่านทันทีหลังเลือกไฟล์, เติมค่าร่วม/เลือกทั้งหมด/กรองแถวที่ต้องเติม/ยืนยันชุดครั้งเดียว
- Parser ส่ง source_columns แบบตัดค่าผู้ป่วย/รูป/คอลัมน์ไม่รู้ความหมาย พร้อมเสนอ NRLS เฉพาะขั้นตอนเดียวที่ชัดเจน
- คงการตรวจสิทธิ์ Admin หรือ hospital RM, token ผูกผู้ใช้, ตรวจซ้ำ และ validation ก่อนสร้างจริง ไม่มี schema/migration
- เวลา CSV ไม่มี ต้องกรอกเวลาเกิดเหตุจริง; ห้ามนำเวลาส่งฟอร์มหรือเดาเวลามาใช้
- ไฟล์: Layout.tsx, MedicationImport.tsx, medication-import.utils.ts/.spec.ts, docs/MEDICATION-CSV-IMPORT-TH.md, CURRENT_STATUS.md
- ไม่มี deploy รอบนี้: backup path/running commit/production health ไม่ได้ตรวจ

ผลตรวจ: frontend/backend build ผ่าน; backend tests 28 suites / 232 tests ผ่าน; browser QA ด้วยข้อมูลจำลอง ตรวจเติมเวลา 2 แถว ข้ามแถวซ้ำ และ batch confirm ส่งคำขอครั้งเดียวสำเร็จ 2 แถว ไม่มีการเขียนฐานข้อมูลจริง ปรับ sticky panel ให้ใช้เฉพาะจอใหญ่เพื่อให้จอเล็กเลื่อนตารางได้ ผล diff --check ผ่าน
เผยแพร่โค้ดใน branch codex/medication-import-table; ยังไม่ deploy production: backup / running commit / health production ไม่ได้ตรวจในรอบนี้

ปรับภาพรวมรายเดือน: เปิดค่าเริ่มต้นเป็นตารางกระชับหนึ่งบรรทัดต่อรายการ มีปุ่มดู/แก้ไขเพื่อเปิดรายละเอียด CSV ของแถวเดียว สลับทุกคอลัมน์ได้ ไฮไลต์สีเหลืองช่อง CSV ที่มีค่าและใช้ประกอบการนำเข้า ซ่อนหัวข้อคอลัมน์ 17 ทั้งสองตำแหน่งโดยไม่แก้ CSV และไม่เปลี่ยน backend/ฐานข้อมูล ข้อจำกัดเดิม 500 รายการ/5 MB ต่อไฟล์ ยังไม่ deploy production
ผลตรวจรอบภาพรวม: frontend build ผ่าน (มีคำเตือน bundle size เดิม), backend build ผ่าน, diff --check ผ่าน ยังไม่ได้ตรวจมุมมองใหม่ใน browser รอบนี้; ไม่มี database migration, backup/running commit/health production ไม่ได้ตรวจเพราะไม่ deploy

## 5 ตุลาคม 2569 — อนุมัติ release Timeline / RCA assistant ล่าสุด

- ผู้ใช้สั่ง deploy: รวม f8a185f2 และ dd3c641a กับ origin/main ddbc50a3 โดยเก็บงานใหม่ของ main ครบ Conflict เฉพาะ CURRENT_STATUS.md แก้โดยรักษาบันทึกทั้งสองฝั่ง
- frontend/backend build ผ่าน; backend 33 suites / 275 tests; Timeline extraction/Excel 10 tests ผ่าน; diff --check ผ่าน ไม่มี migration ใหม่เทียบ main ที่ production ใช้อยู่
- สำรองก่อน release: /var/backups/riskhrms/riskhrms-db-20261005T015229Z.sql; SHA-256 460b8b27065d4dbe744488ad577c4f1a0163a13edd459458da358dfe13a25f3d ยืนยันไฟล์ nonempty และ checksum แล้ว
- ก่อน push production active ที่ ddbc50a3, health ok / database connected และ login ด้วยบัญชีทดลองผ่าน
- ขั้นตอนถัดไป: push main ให้ poller deploy ผ่าน updater เดิม แล้วตรวจ running commit, updater backup, health, read-only incident list และ Timeline โดยไม่แก้ clinical records; ผลยืนยันหลัง deploy เก็บใน tmp/rca-preview/DEPLOY-20261005.md

## 5 ตุลาคม 2569 — นำเข้ารายชื่อเจ้าหน้าที่ปัจจุบัน

- Branch: `codex/personnel-roster-import`; isolated checkout `.worktrees/current-personnel-roster` preserves unrelated work in the primary workspace.
- Source CSV inspected locally only: 171 personnel records, no malformed/duplicate normalized names, 21 distinct group/unit pairs; no citizen ID column. Actual names/HR file are not committed or sent externally.
- Admin-only preview/commit under `/members/roster`: compares previous snapshot and existing member names; requires resolving ambiguous links and department mapping, supports unlinked people, lists absent prior names, one atomic full-roster confirmation with as-of date.
- UI in PersonnelManagement; IndividualReportStats displays roster date, unlinked-to-login count, and update link for Admin. Staff-report denominator and monthly unique reporters refer to the latest roster; historical clinical data and account roles remain unchanged.
- Files: new roster controller/service/parser and tests; new PersonnelRosterImport component; members.module.ts, incidents.service.ts and current-personnel-stats.spec.ts; PersonnelManagement.tsx, IndividualReportStats.tsx; Prisma schema/migration; docs/CURRENT-PERSONNEL-ROSTER-TH.md.
- Database impact: two additive snapshot tables in migration `20261005100000_current_personnel_roster`; no execution against any actual database yet. Deploy must use reviewed migration via updater / `prisma migrate deploy` after verified backup.
- Validation: both application builds passed (existing frontend bundle warning); schema validate passed using placeholder URL without DB access; 36 suites / 287 tests passed, including snapshot ownership/staleness/dedup and roster reporting. Synthetic browser QA: status comparison, unlinked filter, date/full-snapshot gate and one request for confirmation passed. Local real CSV parser returned 171 records / 0 errors / 0 duplicate names. Migration SQL reviewed against Prisma schema, not executed against a database.
- No production deployment or real HR import in this task yet: backup path, running commit, production health not checked. Follow-up is release/migration and Admin mapping of units/people followed by real import; do not fabricate identifiers or mutate accounts to match the file.
