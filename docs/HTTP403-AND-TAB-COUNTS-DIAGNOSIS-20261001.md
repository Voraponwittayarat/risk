# ตรวจ API 403 และยอดเมนูไม่ขึ้น — 1 ตุลาคม 2569

ตรวจ production commit `105b9d20` ตามภาพหน้าหน่วยงาน โดยอ่านเฉพาะ HTTP metadata, aggregate และ error signature ที่กรองบน server

## ผลตรวจ

- โดเมน HTTPS: health, departments และ CSS ตอบ403 `text/html` พร้อม `cf-mitigated: challenge`, server=cloudflare
- Origin: health200, CSS200 `text/css`; บัญชีทดสอบ login201, departments/form-data/incident list200 JSON
- RAM available13716MB, swap0, service active, NRestarts0, memoryประมาณ108MB
- tab-counts origin500: `PrismaClientValidationError`, Unknown argument `_ref`
- read-only Prisma count ยืนยัน `not: fields.department_id` ใช้ไม่ได้ แต่ `equals: fields.department_id` ใช้ได้ จึงแก้เป็น `NOT: { sendto_department_id: { equals: fields.department_id } }` โดยรักษาเงื่อนไขส่งข้ามหน่วยงานเดิม
- ไม่มีการเปลี่ยนข้อมูลคลินิก, schema, DNS/TLS หรือกฎCloudflare; connector ไม่พบ zone dpdns.org/riskhrms.dpdns.org จึงยังระบุกฎ challenge ที่ต้นเหตุไม่ได้

ตัวกรองใหม่ผ่านการทดสอบกับ Prisma ที่ production แบบอ่านอย่างเดียวทั้ง count และ findMany ที่ select ID จำกัด1 โดยไม่ส่งค่ารายการออกมา; backend incident tests ผ่าน75 tests

frontend/backend build และ git diff check ผ่าน งานแก้ตัวกรองยังไม่ deploy จึงยังไม่ได้ทำ backup ใหม่หรือเปลี่ยน running commit ในรอบตรวจนี้

## ขั้นต่อไป

- ผู้ดูแล zone ตรวจ Security Events ตาม host/path และเวลาที่เกิดปัญหา เพื่อระบุ rule/service ที่ challenge API และ CSS แล้วปรับเฉพาะกฎนั้นให้เหมาะกับ SPA/XHR โดยรักษาการป้องกัน API
- การแก้ตัวกรอง backend ต้อง build/test/review ก่อน release main ผ่าน backup/updater ตาม runbook
- หลัง release ตรวจ tab-counts origin200 แล้วตรวจโดเมนว่า APIเป็น JSON และ CSSเป็น text/css โดยไม่มี challenge บนคำขอในหน้าที่ผ่านการยืนยันแล้ว

อ้างอิง: https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/ และ https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/
