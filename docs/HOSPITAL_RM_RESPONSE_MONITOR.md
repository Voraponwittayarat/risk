# หน้าติดตามการตอบสนองหน่วยงาน / CAPA

หน้า `/capa` และ API `GET /capa`, `GET /capa/department-response` อนุญาตเฉพาะ `role=rm_committee` และ `rmScope=hospital` เท่านั้น รวมถึงปิดการเข้าผ่าน URL โดยตรงและซ่อนเมนู/ลิงก์จากผู้ใช้อื่น (รวม Admin)

## วิธีคำนวณ

- อ่านทะเบียนหน่วยงานทั้งหมดด้วย ID และชื่อเท่านั้น ไม่กำหนดเลข ID หรือจำกัดจำนวนไว้ที่ 17 เพื่อไม่ทำหน่วยงานตกหล่น
- อ่าน SLA ประเภท `INCIDENT`, ขั้นตอน `REVIEW_OWNER`, สถานะ `ACTIVE` หรือ `COMPLETED`
- ใช้หน่วยงานรับผิดชอบใน SLA; เริ่มนับจาก `started_at` ถึง `completed_at` ซึ่งระบบบันทึกเมื่อ Owner ส่งผลทบทวนครั้งแรกในรอบนั้น
- ค่าเฉลี่ย มัธยฐาน และร้อยละตรงเวลาคำนวณเฉพาะเรื่องที่ตอบแล้ว; ตรงเวลาคือเสร็จไม่เกิน `due_at`
- เรื่องรอตอบและรอเกินกำหนดคิดเฉพาะ SLA ที่ยัง ACTIVE; เวลารอนานที่สุดนับถึงเวลาเรียกข้อมูล
- ใช้ชั่วโมงปฏิทิน ไม่หักวันหยุด ช่วงวันที่กรองวันเริ่มส่งทบทวนแบบรวมวันสิ้นสุดตามเวลาไทย
- ใช้รอบ SLA ล่าสุดของแต่ละเรื่อง เนื่องจากระบบเดิมเขียนทับ SLA เมื่อเริ่มรอบใหม่ จึงไม่ใช่ประวัติทุกรอบ
- เรื่องเก่าที่ไม่มี SLA ไม่รวม; เวลาไม่สมบูรณ์หรือไม่พบหน่วยงานแสดงจำนวนที่ไม่นำมาคำนวณ; หน่วยงานไม่มีเรื่องแสดงศูนย์และขีดสำหรับค่าที่คำนวณไม่ได้
- ตัวกรองสถิติหน่วยงานแยกจากตัวกรองรายการ CAPA ด้านล่าง

## ไฟล์ที่เปลี่ยน

- `backend/src/modules/capa/capa.controller.ts`: API ติดตามสำหรับ RM โรงพยาบาล
- `backend/src/modules/capa/capa.service.ts`: ตรวจสิทธิ์และสรุประยะเวลาระดับหน่วยงานแบบอ่านอย่างเดียว
- `backend/src/modules/capa/department-response.spec.ts`: ทดสอบสิทธิ์ วันที่ ค่าเฉลี่ย SLA และหน่วยงานที่ไม่มีเรื่อง
- `frontend/src/App.tsx`: ป้องกันเส้นทางหน้า
- `frontend/src/components/Layout.tsx`: เมนูตามสิทธิ์
- `frontend/src/components/DepartmentResponseMonitor.tsx`: ตารางสถิติ ช่วงวันที่ การเรียง และสถานะโหลด/ข้อผิดพลาด
- `frontend/src/pages/CapaWorkspace.tsx`: รวมตารางติดตามกับรายการ CAPA
- `frontend/src/pages/IncidentDetail.tsx`: ซ่อนลิงก์ตามสิทธิ์
- `.github/workflows/deploy-production.yml`: deploy อัตโนมัติเมื่อ push/merge เข้า main
- `.gitattributes`: บังคับ line ending ของ shell script และ workflow ให้เหมาะกับ Ubuntu
- `deploy/ubuntu/update-hrms.sh`: ป้องกัน deployment ซ้อนกันด้วย process lock
- `deploy/README-UBUNTU-TH.md`: วิธีตั้ง GitHub Environment, SSH และ sudo แบบจำกัดคำสั่ง
- เอกสารฉบับนี้

## การตรวจสอบและส่งมอบ

ใช้ `npm test -- --runInBand src/modules/capa` ใน backend และ `npm run build` ใน frontend/backend

ไม่มีการเปลี่ยน schema หรือข้อมูลฐานข้อมูล ไม่ต้องมี migration และยังไม่ได้ deploy จึงไม่มี backup path หรือ production health-check จากงานนี้ ฐาน commit ขณะเริ่มงานคือ `1885073c`; commit ที่ production กำลังใช้ยังไม่ได้ตรวจสอบ

ก่อนใช้งานจริงให้ตรวจว่าทะเบียนมี 17 หน่วยงานตามที่โรงพยาบาลใช้งาน และบัญชี RM โรงพยาบาลกำหนด scope ถูกต้อง จากนั้นดำเนินการ deploy ตามคู่มือเมื่อผู้ดูแลสั่งโดยชัดแจ้ง หลัง deploy ตรวจ health, login, รายการอุบัติการณ์แบบอ่านอย่างเดียว และทดสอบหน้า `/capa` ด้วยบัญชี RM โรงพยาบาลและบัญชีสิทธิ์อื่น
