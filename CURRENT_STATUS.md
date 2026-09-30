# RiskHRMS Current Status

อัปเดต: 30 กันยายน 2569

## สถานะล่าสุด

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
