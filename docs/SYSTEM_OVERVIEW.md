# สรุประบบ (SYSTEM OVERVIEW)

## ภาพรวม

โปรเจคนี้เป็นแอพพลิเคชันที่ใช้ Yii2 (Advanced Project Template) โดยแยกเป็นส่วนหลักคือ `frontend`, `backend` (environment-based), `console`, และ `common` สำหรับคอนฟิกและโค้ดที่ใช้ร่วมกัน

## โครงสร้างสำคัญ

- Entry point (หน้าเริ่มต้น): `index.php` (root) — ปัจจุบันเป็นสคริปต์ redirect ไปยัง `frontend/web/index.php`。
- หน้าสำหรับ front-end: `frontend/web/index.php`。
- คอนโซล: มี `yii`/`yii.bat` ใน root และ `console` โฟลเดอร์สำหรับคำสั่ง CLI/migration。
- โค้ดที่ใช้ร่วม: `common/config/main.php` (aliases, vendorPath, components)
- ไลบรารี/Dependency: `composer.json` ระบุแพ็กเกจ Yii2 และ extensions หลายตัว (Kartik, dektrium user, mpdf, ฯลฯ)

## การเชื่อมต่อฐานข้อมูล & โครงสร้าง

- ไฟล์ SQL dump: `riskhospital.sql` (ฐานข้อมูลหลัก มีหลายตาราง เช่น `risk`, `member`, `department`, `hospital`, ฯลฯ)
- migrations: `console/migrations/m130524_201442_init.php` (ตัวอย่าง migration สร้างตาราง `user`)
- มีตาราง `migration` ใน SQL dump สำหรับติดตาม migration ที่รันแล้ว

## การรันระบบ (Windows)

- พัฒนา/รัน local ด้วย PHP + Apache (เป็นโครงสร้างที่คาดว่าจะใช้กับ XAMPP) หรือใช้ PHP built-in server:

```bash
cd frontend
php -S localhost:8080 -t web
```

- ใช้ `yii.bat` บน Windows สำหรับคำสั่ง console เช่น migration, fixture, cron jobs:

```bash
php yii migrate
yii.bat migrate
```

## คำสั่งที่ใช้บ่อย

- ติดตั้ง dependencies: `composer install`
- รัน migration: `php yii migrate` (รันจาก root หรือใช้ `yii.bat` บน Windows)
- รัน unit tests / codeception: ดู `tests/` และ `codeception.yml`

## ตำแหน่งไฟล์สำคัญ (สรุป)

- โฟลเดอร์แอป: `frontend/`, `console/`, `common/` และ `environments/` (dev/prod)
- คอนฟิกหลัก: `common/config/main.php`, `frontend/config/main.php`, `console/config/main.php` (ตั้งค่าแอป, components)
- ไฟล์ entry: `index.php` (root redirect), `frontend/web/index.php`
- SQL dump: `riskhospital.sql`
- Migrations: `console/migrations/`
- Dependencies: `composer.json`, `vendor/`

## หมายเหตุ / ข้อแนะนำ

- โครงสร้างเป็น Yii2 Advanced template — ระวัง config ที่ถูก override ใน `environments/` (dev/prod)
- ก่อนรันในสภาพแวดล้อมจริง ตรวจสอบ `db` config (user/pass/host) ใน `common/config` หรือ `frontend/config`/`console/config` ที่เกี่ยวข้อง
- ถ้าต้องการนำฐานข้อมูลจาก `riskhospital.sql` เข้าสู่ local ให้สำรองข้อมูลเดิมก่อน และรันผ่านเครื่องมือ MySQL (phpMyAdmin / mysql CLI)

---

เอกสารนี้เป็นสรุปภาพรวมเบื้องต้น — แจ้งได้ถ้าต้องการให้ขยายเป็นหัวข้อย่อย (API, flow ของหน้า/Controller, ER diagram) หรือเพิ่มวิธีการรันแบบขั้นตอนละเอียด
