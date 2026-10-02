# TODO / Next Steps

- [x] รวมผลดำเนินการในหน้าทบทวน: หน่วยงานใช้ Mini; ส่งศูนย์ใช้ Standard; ส่งตรงไม่บังคับปัจจัยร่วมและมาตรการ; Concise เริ่มจากเลือกหลายเหตุการณ์ในหน้ารายการ
- [ ] ตรวจหน้าทบทวนบน staging ด้วยบัญชีหัวหน้า/RM/ทีมนำ รวมกรณีส่งตรง, RCA เดิม, งาน CAPA ค้าง และจำหน่ายไม่สำเร็จหลังบันทึกทบทวน
- [ ] หลังอนุมัติ release ตรวจ backup และ SHA-256 ก่อน merge/push main; ตรวจ health/login/รายการและ flow ทบทวนหลัง poller deploy
- [ ] ตรวจการแก้ไขเอกสาร Mini/Concise เดิมและการ sync CAPA ก่อนเพิ่มช่องทางแก้เอกสารเดิม (รอบนี้เปิดรายการเดิมเพื่อดู ไม่เขียนทับ CAPA)

- [ ] ตรวจหน้าต่างยืนยันด้วยข้อมูลทดสอบ Clinical และ General รวมกรณีเปลี่ยนประเภท NRLS และระดับเดิมไม่ตรงประเภท หลัง deploy

- [ ] Review และ merge branch นี้กับ `main` หลังผู้ดูแลตรวจผล RCA/performance
- [ ] ก่อน deploy ให้รัน `deploy/ubuntu/backup-hrms.sh` และตรวจ SHA-256 ของ backup
- [ ] ใช้ `prisma migrate deploy` สำหรับ migration RCA ในฐานข้อมูลทดสอบก่อน production
- [ ] หลัง deploy ตรวจ `/health`, login, รายการ `/incidents/pending` และ RCA แบบอ่านอย่างเดียวจากเครื่องอื่น
- [ ] ย้ายการกรองสิทธิ์ของ CAPA จากการอ่านแล้ว filter ใน Node.js ไปเป็นเงื่อนไข Prisma พร้อม pagination
- [ ] ปรับรายงาน matrix และ decision support ให้ใช้ aggregate/pagination ฝั่งฐานข้อมูลเมื่อจำนวน incident เพิ่ม
- [ ] ตรวจ load test การเปิดหลายเครื่องพร้อมกัน โดยไม่ใช้ข้อมูลผู้ป่วยจริง
