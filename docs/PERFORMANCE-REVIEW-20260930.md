# ตรวจอาการค้างและยอดโหลดช้า

วันที่ 30 กันยายน 2569
Branch: `codex/performance-resource-usage` (ต่อจาก `codex/rca-workflow-usability`)

## หลักฐานจาก production แบบอ่านอย่างเดียว

- Running commit `cf01a1dc`; service riskhrms และ MariaDB active, ไม่มี restart
- RAM รวม 15,471 MB ใช้ 1,569 MB, available 13,901 MB; swap ใช้ 0; ดิสก์ใช้ 6%
- riskhrms ใช้ RAM ประมาณ 303 MB, MariaDB ประมาณ 217 MB; load average ณ เวลาตรวจ 0.00
- `/health` จาก localhost ตอบ HTTP 200 ใน 0.006 วินาที
- จำนวนแถว: riskregister 4,804; riskreview 4,209; standard_rca_case 7; riskanalysis 131; capa_action 0
- สถานะข้างต้นเป็นจุดเวลาเดียว ไม่พิสูจน์ว่าไม่มีโหลดสูงเป็นช่วง ๆ; ไม่ได้เปิดดูข้อมูลผู้ป่วยหรือ log รายรายการ
- การเรียก health ผ่าน public URL จากเครื่องพัฒนาถูกตอบ 403 ใน 0.5 วินาที จึงไม่ใช้ผลนี้ชี้วัด backend

## สาเหตุจากโค้ดและการแก้ไข

1. Dashboard เรียก `/incidents/my-reported` ซึ่งอ่านรายการทั้งปี แต่แสดงเพียง 5 เรื่อง จากนั้นเดิมอ่านหัวข้อและหน่วยงานแยกสูงสุด 3 query ต่อเรื่อง แก้ให้ขอ `summary=true` อ่าน 5 เรื่องและนับยอดจริงที่ฐานข้อมูล; รายการชื่ออ่านแบบชุด 2 query
2. หน้า “ความเสี่ยงที่คุณรายงาน” ยังคงแสดงทั้งปีตามพฤติกรรมเดิม แต่เลิก query ชื่อทีละเรื่องและเลือกเฉพาะ field ที่ใช้
3. หน้า RCA เรียก overview statistics ซ้ำกับ RCA lists ทั้งที่ใช้เพียงยอด CAPA ค้าง แก้ `summary=true` ให้นับที่ฐานข้อมูลแทนโหลด RCA/CAPA ทุกแถว
4. ตรวจปีงบประมาณที่ขอให้อยู่ในช่วงสมเหตุสมผลก่อนสร้าง query

ยังพบจุดที่ควรวางแผนต่อ: CAPA workspace อ่าน CAPA ทุกแถวก่อนกรองสิทธิ์ในหน่วยความจำ และบางหน้ารายงานอ่านเหตุการณ์ทั้งช่วงเพื่อคำนวณ matrix; เหมาะกับ pagination/aggregate ฝั่งฐานข้อมูลเมื่อข้อมูลเพิ่ม โดยต้องรักษาการมองเห็นตามสิทธิ์เดิม

## การตรวจและ release

- `npm run build` frontend/backend ผ่าน
- Backend Jest 24 suites, 189 tests ผ่าน
- ไม่มี schema migration และไม่มีการแก้ฐานข้อมูล
- ยังไม่ได้ deploy; ไม่มี backup ใหม่; production ยังเป็น commit `cf01a1dc`; health ผ่าน ณ เวลาตรวจ
- Branch นี้ต่อจาก branch RCA ที่ยังไม่ได้ merge ต้อง review รวมกันก่อน release ตาม AGENTS.md
