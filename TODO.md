# TODO / Next Steps

- [ ] Review และ merge branch นี้กับ `main` หลังผู้ดูแลตรวจผล RCA/performance
- [ ] ก่อน deploy ให้รัน `deploy/ubuntu/backup-hrms.sh` และตรวจ SHA-256 ของ backup
- [ ] ใช้ `prisma migrate deploy` สำหรับ migration RCA ในฐานข้อมูลทดสอบก่อน production
- [ ] หลัง deploy ตรวจ `/health`, login, รายการ `/incidents/pending` และ RCA แบบอ่านอย่างเดียวจากเครื่องอื่น
- [ ] ย้ายการกรองสิทธิ์ของ CAPA จากการอ่านแล้ว filter ใน Node.js ไปเป็นเงื่อนไข Prisma พร้อม pagination
- [ ] ปรับรายงาน matrix และ decision support ให้ใช้ aggregate/pagination ฝั่งฐานข้อมูลเมื่อจำนวน incident เพิ่ม
- [ ] ตรวจ load test การเปิดหลายเครื่องพร้อมกัน โดยไม่ใช้ข้อมูลผู้ป่วยจริง
