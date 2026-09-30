# ผลแก้ไข RCA workflow และ usability

วันที่สรุป: 30 กันยายน 2569
Branch: `codex/rca-workflow-usability`
Baseline: `cf01a1dcaf3bf1d973993e2096add4b306a64cb9`
สถานะ: แก้ไขในเครื่องพัฒนา ยังไม่ได้ deploy หรือใช้ migration กับฐานข้อมูลจริง

## สิ่งที่เปลี่ยน

- ใช้แถบกระบวนการร่วมกันระหว่างยืนยัน ทบทวน RCA CAPA และทะเบียนความเสี่ยง
- หน้ารวมเริ่มที่ทั้งหมดและประวัติ ค้นด้วยเลขเหตุการณ์ RM RCA NRLS และหัวข้อ พร้อมกรองหน่วยงานและแยกรายการทบทวนแล้ว
- มีทางเลือกเหตุการณ์ต้นทางเพื่อเริ่ม RCA พร้อมข้อความชัดเจนว่ารายการต้นทางแสดงล่าสุดสูงสุด 50 รายการ
- Standard RCA แบ่ง 7 ขั้น แสดงข้อมูลที่ยังขาดและแยกเครื่องมือวิเคราะห์เพิ่มเติม
- เก็บข้อมูลทะเบียนและมาตรการที่กรอกไม่เสร็จในร่าง การเปิดอ่านเฉย ๆ ไม่ autosave และใช้ version ป้องกันเขียนทับเมื่อแก้พร้อมกัน
- รักษา ID และประวัติ CAPA เดิม ไม่ลบสร้างใหม่เมื่อบันทึก RCA; มาตรการใหม่เข้า monitoring เมื่อสรุป RCA
- แยกสิทธิ์อ่าน แก้ไข สรุป จัดทีม และข้อมูลสัมภาษณ์; เปิด CAPA workspace ตามขอบเขตสิทธิ์
- หัวหน้าหน่วยงานอนุมัติปิด CAPA ระดับต่ำ/กลางได้เมื่อเป็นคนละคนกับผู้ดำเนินการ ส่วนระดับสูงยังผ่าน RM
- ปิดทะเบียนผ่านการทบทวนพร้อมหลักฐานประสิทธิผล และ CAPA ที่เกี่ยวข้องต้องปิดอย่างได้ผล
- เชื่อมทะเบียนเดิมต้องเลือกยืนยัน ไม่สร้างหรือเชื่อมเงียบเมื่อพบทะเบียนซ้ำ

## หลักฐานทดสอบ

รอบสุดท้าย 30 กันยายน: backend 24 suites / 187 tests ผ่าน; build frontend/backend ผ่าน; prisma validate และ git diff --check ผ่าน
ทดสอบ UI ด้วย fixture ในเครื่อง ไม่มีฐานข้อมูลหรือ API production: ค้นรายการทบทวนแล้วด้วยเลขเหตุการณ์, เปิด CAPA ด้วยสิทธิ์ RM หน่วยงาน, เลือกเหตุการณ์เริ่ม RCA, บันทึกร่างและเปิดใหม่ ข้อความความเสี่ยง เจ้าของ โอกาสเกิด และรอบทบทวนคืนค่าครบ; เปิดอ่านร่างแล้วจำนวน PATCH ยังคง 0
Fixture เป็นเพียง UI harness ไม่ใช่ Nest/MariaDB integration test; รองรับเฉพาะหน้า RCA/CAPA ที่ตรวจ ไม่ครอบคลุม Dashboard หรือการสรุป RCA จริง
ยังไม่ทดสอบ migration บน MariaDB สำเนา และยังไม่ตรวจ responsive/mobile ครบทุกขั้น
Vite แจ้ง bundle ใหญ่กว่า 500 kB เป็นคำเตือน ไม่ใช่ build failure

## ผลกระทบฐานข้อมูลและ release

Migration เพิ่ม `standard_rca_case.draft_register`, `standard_rca_case.version`, `standard_rca_capa.client_key` ไม่มีการลบข้อมูล
ก่อน release ต้อง review migration และทดสอบบนฐานข้อมูลทดสอบ ใช้ backup-hrms.sh ตรวจ dump และ SHA-256 ก่อน updater
ตาม AGENTS.md ต้องอนุมัติผลก่อน merge/push main ให้ server poller deploy; ไม่แก้ source ผ่าน SSH
หลัง deploy ตรวจ /health, login, incident list แบบอ่าน และ RCA ที่เปลี่ยนโดยไม่แก้ข้อมูลคลินิกจริง
ครั้งนี้ไม่ได้ deploy จึงไม่มี backup ใหม่ และไม่ได้ยืนยัน running commit/health ปัจจุบัน
ผลตรวจ production ครั้งก่อน (21 กันยายน): commit cf01a1dc, service active, health/database ผ่าน; เป็นข้อมูลย้อนหลัง ไม่ใช่สถานะปัจจุบัน
Backup ที่ตรวจครั้งก่อน: /var/backups/riskhrms/riskhrms-db-20260921T112928Z.sql (ตรวจ checksum ผ่าน)
เก็บการแก้ไขเดิมของผู้ใช้ใน RISK-REVIEW-AND-RISK-REGISTER-PRINCIPLES-TH.md ไว้ ไม่รวมใน commit นี้

## ไฟล์ที่เปลี่ยน

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260921160000_rca_safe_drafts/migration.sql`
- `backend/src/modules/rca/rca.service.ts`
- `backend/src/modules/rca/rca.service.spec.ts`
- `backend/src/modules/capa/capa.service.ts`
- `backend/src/modules/capa/capa.service.spec.ts`
- `backend/src/modules/capa/department-response.spec.ts`
- `backend/src/modules/risk-analysis/risk-analysis.service.ts`
- `backend/src/modules/risk-analysis/risk-analysis.service.spec.ts`
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/RiskWorkflowNav.tsx`
- `frontend/src/pages/IncidentList.tsx`
- `frontend/src/pages/CapaWorkspace.tsx`
- `frontend/src/pages/Reports.tsx`
- `frontend/src/pages/rca/RcaList.tsx`
- `frontend/src/pages/rca/StandardRcaForm.tsx`
- `frontend/scripts/rca-review-preview.cjs`
