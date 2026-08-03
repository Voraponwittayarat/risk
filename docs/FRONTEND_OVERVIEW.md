# FRONTEND — สรุปการทำงาน

## ภาพรวม

ส่วน `frontend` ของโปรเจคเป็นแอปลูกของ Yii2 (app-frontend) สำหรับผู้ใช้งานทั่วไป (UI) โดยมีคอนฟิกแยก (`frontend/config/main.php`) และใช้โมดูล/extension เช่น `dektrium\user` สำหรับจัดการผู้ใช้

## Entry point

- `frontend/web/index.php` — จุดเข้าของแอปเมื่อเรียกผ่านเว็บเซิร์ฟเวอร์ (root `index.php` จะ redirect มายัง `frontend/web/index.php`)

## คอนฟิกสำคัญ

- `frontend/config/main.php`:
  - `id` = `app-frontend`, `timeZone` = `Asia/Bangkok`, `language` = `th_TH`
  - `controllerNamespace` = `frontend\controllers`
  - `components.user` ใช้ `dektrium\user\models\User` เป็น `identityClass`
  - `components.session` ใช้ `\frontend\components\CustomDbSession` เก็บ session ลงตาราง `session_frontend_user` และมี `writeCallback` เพิ่ม `user_id` และ `ip`
  - โมดูล: `user` (dektrium), `gridview` (kartik), `pdfjs`

## Assets & Themes

- `frontend/assets/AppAsset`:
  - CSS: `css/site.css`, `css/navbar.css`
  - JS: `js/modal.js`
  - ขึ้นต่อ: `YiiAsset`, `BootstrapAsset`, `FontAwesome`
- `frontend/assets/DatatablesAsset`:
  - ใช้ `sourcePath='@app/themes'` และรวมไฟล์ DataTables (css/js, export plugins)

## Components ที่สำคัญ

- `frontend/components/CustomDbSession`:
  - ขยาย `\yii\web\DbSession`
  - `writeCustomFields` จะบันทึก `user_id` และ `REMOTE_ADDR` ลงในตาราง session

## Layout & view flow

- Layout หลัก: `frontend/views/layouts/main.php`
  - ลงทะเบียน `AppAsset` และใช้ `NavBar`, `NavX`, `Breadcrumbs` และ widget alert
  - เมนูหลักจะปรับตามสถานะ `Yii::$app->user` (guest / logged-in) และ `role` ของผู้ใช้
  - Footer แสดงเวอร์ชันจากไฟล์ `version/version.txt` และนับจำนวนผู้เยี่ยมชมจาก `session_frontend_user`

## Controllers (ตัวอย่างที่มีในโฟลเดอร์)

- รายการ controller ที่พบ: `DepartmentController`, `DepartmentgroupController`, `DurationController`, `HelpController`, `HistoryController`, `HistoryviewController`, `HospitalController`, `InformController`, `LevelController`, `LevelwarningController`, `LocationController`, `MemberController`, `PositionController`, `ProgramController`, `Report1Controller`, `Report2Controller`, `ReviewresultsController`, `RiskController`, `RiskgroupController`, `RiskhistoryController`, `RiskregisterController`, `RiskreviewController`, `RiskstoreController`, `SiteController`, `StatusController`, `TeamController`, `TypeController`.
- แต่ละ controller มักมี action พื้นฐาน เช่น `actionIndex`, `actionView`, `actionCreate`, `actionUpdate`, `actionDelete` ตามแนวทาง CRUD ของ Yii2

## การไหลของคำขอ (Request flow)

1. เบราว์เซอร์ร้องขอ URL → web server
2. `frontend/web/index.php` โหลด Yii app ตาม config
3. Router หา `controller/action` และเรียก action
4. Action ประมวลผล (เรียก model, service) → `render()` view
5. View ถูกแทรกเข้า layout (`views/layouts/main.php`) → Assets ถูกลงทะเบียน
6. ผลลัพธ์ส่งกลับไปยังผู้ใช้

## Authentication / Authorization

- ใช้ `dektrium\user` module สำหรับ login/registration/profile (`/user/security/login`, `/user/registration/register`, `/user/settings/profile`)
- ในเมนูและ action มีการตรวจ `Yii::$app->user->isGuest` และ `Yii::$app->user->identity->role` เพื่อแสดง/ซ่อนฟังก์ชัน

## หมายเหตุฐานข้อมูล / session

- ตาราง `session_frontend_user` ถูกใช้เก็บ session (CustomDbSession)
- ตรวจสอบ `db` config ใน `common/config` หรือ `frontend/config` เพื่อดูการตั้งค่า connection (host, username, password)

## คำสั่งที่เกี่ยวข้อง (Windows)

```bash
cd c:\path\to\project\frontend
php -S localhost:8080 -t web
# หรือ ใช้ Apache/XAMPP ให้ DocumentRoot ชี้ไปที่ frontend/web
```

คอนโซลคำสั่ง Yii (จาก root project):

```bash
php yii migrate
php yii cache/flush-all
```

## Debugging & logs

- เปิด `YII_DEBUG` ใน environment dev เพื่อดูรายละเอียดข้อผิดพลาด
- ไฟล์ log เก็บที่ `frontend/runtime/logs` (หรือ `runtime/logs` ของแต่ละ app)

## ขยายเพิ่มเติมที่แนะนำ

- สร้างรายการ action & route สำหรับแต่ละ controller (map) เพื่อเข้าใจ flow รายหน้า
- สร้าง ER-diagram จาก `riskhospital.sql` เพื่อเชื่อมความสัมพันธ์ตารางกับฟังก์ชันใน UI
- เพิ่มคำอธิบายของแต่ละ view/template ที่สำคัญ (ตัวอย่าง: form ของ `risk/create`)

---

ไฟล์นี้เป็นสรุปเบื้องต้นของ `frontend` ถ้าต้องการผมจะขยายเป็นแผนผัง route/action ราย controller หรือสร้างตัวอย่าง ER-diagram ให้ต่อได้
