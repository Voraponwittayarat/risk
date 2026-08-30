# 📘 เอกสารส่งต่อระบบ (System Hand-off & Architecture Document)
## ระบบบริหารจัดการความเสี่ยงและอุบัติการณ์ รพ.วังเจ้า (riskHRMS)

---

## 0. สถานะส่งต่อครั้งล่าสุด — 27 สิงหาคม 2569

### เป้าหมายและงานที่ดำเนินการแล้ว

งานรอบล่าสุดมุ่งปรับกระบวนการรายงาน–ยืนยัน–ทบทวนความเสี่ยงให้สอดคล้องกับบทบาท RM/หัวหน้างาน และลดการข้ามขั้นตอนของ Workflow โดยมีผลสำคัญดังนี้

1. เมื่อส่งรายงานใหม่สำเร็จ ระบบนำผู้รายงานไปยังหน้ารายละเอียดของความเสี่ยงที่เพิ่งรายงาน (`/incidents/:id`)
2. ปรับหน้า Dashboard ให้มีเนื้อหาภาพรวมแบบ HRMS และกราฟวงแหวนสถิติความเสี่ยงระหว่างดำเนินการ 4 กลุ่ม
3. แยกขอบเขต `head` เป็นหัวหน้าหน่วยงาน (`department`) และหัวหน้ากลุ่มงาน (`group`) ผ่านค่า `member.rm_scope`
4. จำกัดการบันทึกผลทบทวนรายเคสให้เฉพาะ Admin, RM และหัวหน้าที่อยู่ในขอบเขตรับผิดชอบ เจ้าหน้าที่ทั่วไปยังดูเคสที่ยืนยันแล้วได้แต่บันทึกการทบทวนไม่ได้
5. ปรับปุ่มใน `IncidentList` ให้เดินตามสถานะจริง: รายงาน/แก้ไข → ตรวจสอบ, ตรวจสอบ → เริ่มทบทวน, ทบทวน → RCA, ปิดแล้ว → ดูประวัติ
6. Mini/Standard/Concise RCA จากหน้ารายการใช้ได้เฉพาะเคสที่เข้าสถานะ `ทบทวน` แล้ว
7. ก่อนเปลี่ยนสถานะเป็น `จำหน่าย` หรือ `ไม่ใช่ความเสี่ยง` ต้องยืนยันและระบุเหตุผลอย่างน้อย 10 ตัวอักษร ทั้งฝั่ง UI และ Backend API เหตุผลถูกบันทึกใน Audit Log
8. ตรวจพบเหตุหน้าเว็บไม่มีข้อมูลเมื่อ Backend พอร์ต 3000 หยุดทำงาน ข้อมูลในฐานไม่ได้หาย หลังเปิด Backend แล้ว API และฐานข้อมูลตอบสนองปกติ

### ไฟล์หลักที่แก้ในงานรอบล่าสุด

- `frontend/src/pages/IncidentForm.tsx` — การส่งรายงานและนำทางหลังสำเร็จ
- `frontend/src/pages/Dashboard.tsx` — Dashboard/กราฟสถิติ
- `frontend/src/pages/IncidentList.tsx` — ปุ่มตาม Workflow และข้อจำกัด RCA
- `frontend/src/pages/IncidentDetail.tsx` — สถานีทบทวน, Audit Timeline และ Dialog ยืนยันปิดเคส
- `frontend/src/pages/UserManagement.tsx` — ตั้งขอบเขตหัวหน้าหน่วยงาน/หัวหน้ากลุ่มงาน
- `backend/src/modules/auth/rm-scope.utils.ts` — Normalize ขอบเขต RM และหัวหน้างาน
- `backend/src/modules/incidents/incidents.service.ts` — Record-level permission, scope, transition และ validation
- `backend/src/modules/incidents/incidents.service.spec.ts` — Unit tests ด้านสิทธิ์และ Workflow

### ผลตรวจสอบล่าสุด

- Backend unit tests: **48/48 ผ่าน** (`11 test suites`)
- Backend production build: **ผ่าน**
- Frontend production build: **ผ่าน**
- Frontend lint: **ผ่านโดยไม่มี error** แต่ยังมี warning เดิมบางไฟล์เรื่อง Hook dependency/unused variable
- Vite แจ้งเตือนว่า JavaScript bundle หลักมากกว่า 500 kB ควรพิจารณา code splitting ภายหลัง

### Snapshot ฐานข้อมูลแบบอ่านอย่างเดียว

ตรวจเมื่อ 27 สิงหาคม 2569:

- `riskregister`: 4,798 รายการ
- `member`: 237 รายการ
- `department`: 26 รายการ
- สถานะ `ทบทวน`: 1,018 รายการ
- สถานะ `จำหน่าย`: 2,972 รายการ
- `riskreview`: 4,183 รายการ
- Review ที่ไม่มี `cause_problem`: 412 รายการ (ไม่จำเป็นต้องผิดทุกกรณี แต่ควรบังคับในเคสรุนแรง/RCA)
- เหตุระดับ G–I หรือ 4–5: 71 รายการ; ยังเปิด 28 รายการ; แต่ `rca_required = 1` มี 0 รายการ
- เคสปิดที่ไม่พบ Review สถานะ `ทบทวน` ก่อนปิดมี 2,951 รายการ ส่วนใหญ่มีแนวโน้มเป็นข้อมูล Legacy ต้องแยกข้อยกเว้นก่อนบังคับกฎย้อนหลัง

### ประเด็นเร่งด่วนที่ยังไม่ได้แก้

1. **RCA policy สำหรับข้อมูลเดิม:** ต้องทำ dry-run/backfill ให้เคสรุนแรงเดิมได้รับ `rca_required`, `rca_status`, `rca_due_at` ตามนโยบาย ห้ามอัปเดตฐานจริงก่อนสำรองและตรวจรายการเป้าหมาย
2. **ห้ามปิดเคสก่อนทบทวน:** ปัจจุบัน Backend ยังอนุญาต `ตรวจสอบ → จำหน่าย` สำหรับเคสที่ไม่ติด RCA ควรบังคับให้มี Review อย่างน้อย 1 รอบก่อนปิด ยกเว้นกระบวนการ `ไม่ใช่ความเสี่ยง`
3. **ความหมายผล RCA ไม่ตรงกัน:** ปุ่ม “ได้รับการทำ RCA” ใน `IncidentDetail` ตั้ง `reviewResultId = 3` แต่รหัส 3 ในฐานหมายถึง “RCA แล้วยังเกิดซ้ำแต่ระดับความรุนแรงลดลง” ต้องแยกสถานะ “มีเอกสาร RCA” ออกจากผลลัพธ์หลังติดตาม
4. **มาตรการยังไม่เป็น Structured CAPA:** Review ปกติยังเก็บมาตรการเป็นข้อความก้อนเดียว ควรมี Action, Owner, Department/Team, Due date, Status, Evidence และ Effectiveness review
5. **Audit Timeline:** ควรแสดงชื่อ/ตำแหน่ง/หน่วยงานผู้ทบทวน ไม่ใช่เฉพาะวันที่และข้อความ
6. **4M1E:** ปัจจุบันต่อข้อความทุกหมวดลง `riskreview.cause_problem` ซึ่งเป็น `VARCHAR(255)` ควรแยกโครงสร้างหรือเปลี่ยนเป็น `TEXT` และแยก Machine/Environment ให้ชัด
7. เพิ่ม validation วันที่ทบทวน, SLA/Overdue, หลักฐานแนบ และเงื่อนไขบังคับตามประเภทผลทบทวน

### วิธีเริ่มระบบสำหรับผู้รับช่วงต่อ

1. เปิด XAMPP MariaDB/MySQL และตรวจพอร์ต `3306`
2. จากโฟลเดอร์รากให้รัน `run.bat` หรือ `start_app.bat`
3. ตรวจ `http://127.0.0.1:3000/api` สำหรับ Backend และ `http://127.0.0.1:5173` สำหรับ Frontend
4. หากหน้าเว็บเปิดได้แต่ข้อมูลไม่ขึ้น ให้ตรวจพอร์ต `3000` ก่อน เพราะ Frontend อาจยังทำงานขณะที่ Backend หยุด
5. หลังแก้สิทธิ์หรือ `rm_scope` ให้ Logout/Login ใหม่เพื่อรับ JWT payload ล่าสุด

### ข้อควรระวังในการรับช่วงงาน

- Working tree มีการเปลี่ยนแปลงจำนวนมากและมีไฟล์ใหม่ที่ยังไม่ Commit ให้ถือว่าเป็นงานของผู้ใช้ ห้ามใช้ `git reset --hard`, `git checkout --` หรือเขียนทับไฟล์โดยไม่ตรวจ diff
- ห้ามรัน `prisma db push`, migration, backfill หรือ repair script กับฐานข้อมูลจริงโดยไม่สำรองฐานและตรวจ dry-run ก่อน
- ค่าใน `backend/.env` เป็นข้อมูลลับ ห้ามนำ Token, Password, JWT secret หรือ SMTP credential ไปใส่ในเอกสาร/Commit/ข้อความสนทนา
- ก่อนส่งมอบรอบถัดไปให้รัน Backend tests และ build ทั้ง Backend/Frontend อีกครั้ง

---

## 1. 🌟 ภาพรวมระบบ (System Overview)

**riskHRMS** เป็นระบบบริหารจัดการความเสี่ยง อุบัติการณ์ และความปลอดภัยผู้ป่วย (Patient Safety & Enterprise Risk Management) ของโรงพยาบาลวังเจ้า ถูกออกแบบมาเพื่อรองรับกระบวนการแจ้งเหตุความเสี่ยง การตรวจสอบยืนยัน การทบทวนเคส การวิเคราะห์สาเหตุเชิงลึก (RCA - Root Cause Analysis) การทบทวนเวชระเบียน (Trigger Tool) ตลอดจนการสรุปผลสถิติตารางการรายงานความเสี่ยงรายบุคคลประจำเดือนและการแจ้งเตือนอัตโนมัติผ่าน Telegram

---

## 2. 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack & Architecture)

### 💻 Frontend Architecture
* **Framework**: React 19 + Vite (TypeScript)
* **Styling**: Tailwind CSS 4 + Custom UI Design System
* **Icons**: Lucide React Icons
* **State & Routing**: React Context API (`AuthContext`) + React Router DOM v7
* **HTTP Client**: Axios (พร้อม JWT Interceptor / Authorization Header)
* **Date Utilities**: `date-fns`

### ⚙️ Backend Architecture
* **Framework**: NestJS (TypeScript)
* **ORM & Database Client**: Prisma ORM
* **Database**: MariaDB / MySQL
* **Authentication**: Passport-JWT + Bcrypt Password Hashing
* **API Documentation**: Swagger UI (เข้าถึงได้ที่ `http://localhost:3000/api`)

---

## 3. 📂 โครงสร้างโฟลเดอร์โครงการ (Directory Structure)

```text
riskHRMS/
├── backend/                        # NestJS Backend API Service
│   ├── prisma/
│   │   └── schema.prisma           # ฐานข้อมูล Prisma Database Schema & Models
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/               # ระบบเข้าสู่ระบบ & ถอดรหัส JWT Token
│   │   │   ├── incidents/          # ระบบแจ้งเหตุ ตรวจสอบ ยืนยัน และสถิติความเสี่ยง
│   │   │   ├── departments/        # ระบบจัดการหน่วยงาน กลุ่มงาน และ Telegram Bot รายหน่วยงาน
│   │   │   ├── personnel/          # ระบบจัดการทะเบียนบุคลากร (Pre-registration)
│   │   │   ├── users/              # ระบบจัดการสิทธิ์ผู้ใช้งาน (User Management)
│   │   │   ├── rca/                # ศูนย์จัดการ RCA (Concise & Standard RCA 3 Tiers)
│   │   │   ├── trigger-tool/       # ระบบทบทวนเวชระเบียน 11 Triggers
│   │   │   └── reports/            # ระบบวิเคราะห์ข้อมูล 5x5 Matrix & สถิติตาราง
│   │   ├── app.module.ts           # Root Module
│   │   └── main.ts                 # Entry Point & Global Guards/Pipes
│   └── package.json
│
├── frontend/                       # Vite + React Frontend Web Application
│   ├── src/
│   │   ├── components/             # Reusable UI Components (Layout, Modals, RiskSelector)
│   │   ├── contexts/               # React Auth Context (`AuthContext.tsx`)
│   │   ├── pages/                  # หน้าการทำงานหลักของระบบ
│   │   │   ├── Dashboard.tsx       # หน้าภาพรวมความเสี่ยงวันนี้ (Live Dashboard)
│   │   │   ├── IncidentForm.tsx    # แบบฟอร์มรายงานความเสี่ยง (Auto-bind Discovering Dept)
│   │   │   ├── IncidentList.tsx    # ศูนย์ตรวจสอบ/ยืนยันความเสี่ยง และทบทวนหน่วยงาน
│   │   │   ├── IncidentDetail.tsx  # หน้ารายละเอียดเคส ทบทวน และส่งต่อข้ามแผนก
│   │   │   ├── IndividualReportStats.tsx # สถิติตารางการรายงานความเสี่ยงรายบุคคล (แยกตามกลุ่มงาน)
│   │   │   ├── Reports.tsx         # หน้าวิเคราะห์ข้อมูล 5x5 Risk Matrix & HA Goals
│   │   │   ├── PersonnelManagement.tsx # หน้าจัดการข้อมูลบุคลากร
│   │   │   ├── UserManagement.tsx  # หน้าจัดการสิทธิ์ผู้ใช้งาน
│   │   │   ├── TelegramSettings.tsx # หน้าตั้งค่า Telegram Bot
│   │   │   └── rca/                # แบบฟอร์ม RCA (ConciseRcaForm, StandardRcaForm)
│   │   ├── utils/                  # Status & Risk Level Adapters (`statusAdapter.ts`)
│   │   ├── App.tsx                 # Client-side Router Setup
│   │   └── main.tsx                # Entry Point
│   └── package.json
└── HANDOFF.md                      # เอกสารส่งต่อระบบฉบับนี้
```

---

## 4. 🏢 โครงสร้างการทำงานของหน่วยงานและสิทธิ์ (Department & Permissions Model)

ระบบถูกออกแบบให้เชื่อมโยงหน่วยงานใน **3 ลักษณะหลัก**:

1. **`riskregister.department_id` (หน่วยงานผู้ค้นพบ/ผู้บันทึกรายงาน)**:
   * ดึงจาก **`member.department_id1`** ของผู้รายงานโดยอัตโนมัติเมื่อกดส่งรายงาน
   * ใช้เป็นหน่วยงานตั้งต้นสำหรับให้ **Manager และ หัวหน้าหน่วยงานในแผนกเดียวกัน** เห็นและกดยืนยันความเสี่ยงด่านแรก
2. **`riskregister.sendto_department_id` (หน่วยงานปลายทางส่งต่อ/ร่วมทบทวน)**:
   * กรณีความเสี่ยงส่งผลกระทบข้ามแผนก หัวหน้างานสามารถเลือกส่งต่อเรื่องให้หน่วยงานปลายทางร่วมแก้ไขและบันทึกมาตรการป้องกัน
3. **`departmentgroup` (กลุ่มงาน)**:
   * รวบรวมหลายหน่วยงานย่อย (เช่น *กลุ่มงานการพยาบาล*, *กลุ่มงานบริหารทั่วไป*) ใช้ในสิทธิ์ทบทวนของหัวหน้ากลุ่มงาน (Head of Group) และการสกัดสถิติตารางรายบุคคล

### 🔐 ระดับสิทธิ์และการเข้าถึง (Role Hierarchy)
* **`staff` (เจ้าหน้าที่ทั่วไป)**: สามารถบันทึกความเสี่ยง ดูความเสี่ยงที่ตนเองรายงาน (`/my-reported`) และสถิติสเกลภาพรวม
* **`head` + `rm_scope = 'department'`**: หัวหน้าหน่วยงาน สามารถตรวจสอบ/ยืนยัน บันทึกการทบทวน และส่งต่อเคสในหน่วยงานหลัก/รองที่รับผิดชอบ
* **`head` + `rm_scope = 'group'`**: หัวหน้ากลุ่มงาน สามารถเห็นและจัดการความเสี่ยงของทุกหน่วยงานย่อยในกลุ่มงานเดียวกัน
* **`rm_committee`**: ขอบเขตกำหนดด้วย `rm_scope` เป็น `department`, `group` หรือ `hospital`; เฉพาะ `hospital` จึงเห็นทั้งโรงพยาบาล
* **`admin`**: ผู้ดูแลระบบและข้อมูลตั้งค่า แต่ไม่มีสิทธิ์ตัดสินใจทางคลินิก/ความเสี่ยง เช่น ทบทวน ประเมินประสิทธิผล หรืออนุมัติปิด CAPA

---

## 5. 🔄 เวิร์กโฟลว์หลักของระบบ (Core Workflows)

```mermaid
flowchart TD
    A["เจ้าหน้าที่พบเหตุการณ์"] -->|กรอก IncidentForm| B["บันทึก department_id = member.department_id1 (อัตโนมัติ)"]
    B --> C["ส่งการแจ้งเตือน Telegram รายหน่วยงาน"]
    B --> D["รายการเข้าสู่หน้า 'ตรวจสอบ/ยืนยันความเสี่ยง' (/incidents/pending)"]
    D -->|Manager / หัวหน้าหน่วยงาน กดยืนยัน| E{"ความเสี่ยงกระทบหน่วยงานใด?"}
    E -->|ภายในหน่วยงาน| F["หน่วยงานดำเนินการแก้ไข & ทบทวน"]
    E -->|ข้ามหน่วยงาน| G["ส่งต่อให้หน่วยงานปลายทาง (sendto_department_id)"]
    F --> H["ประเมินทำ RCA (Concise / Standard)"]
    G --> H
    H --> I["สรุปตารางสถิติรายบุคคล / 5x5 Matrix"]
```

### 1️⃣ การแจ้งเหตุการณ์ความเสี่ยง (`/incidents/new`)
* **AI Auto-suggest**: ระบบวิเคราะห์ข้อความรายละเอียดเหตุการณ์และแนะนำหมวดหมู่ความเสี่ยง (NRLS Code / Local Risk) ให้อัตโนมัติ
* **Auto-bind Department**: ผูกหน่วยงานผู้ค้นพบอัตโนมัติตาม `member.department_id1`
* **Image Upload**: อัปโหลดรูปภาพประกอบได้สูงสุด 3 รูป (JPG, PNG, WEBP)

### 2️⃣ การตรวจสอบและยืนยันความเสี่ยง (`/incidents/pending`)
* เป็นศูนย์กลางสำหรับ Manager / หัวหน้าหน่วยงาน เข้ามากด **"ยืนยันความเสี่ยง"** (`status_risk = 'รายงาน'` ➔ `'ตรวจสอบ'`)
* สามารถแก้ไขระดับความรุนแรง (Level A-I) และกำหนดหน่วยงานผู้รับผิดชอบผ่าน `sendto_department_id` ได้ โดย `department_id` เป็นหลักฐานหน่วยงานต้นทางและห้ามแก้ทับหลังสร้างรายการ

### 3️⃣ การทบทวนและส่งต่อ (`/incidents/dept` & `/incidents/:id`)
* บันทึกสาเหตุที่แท้จริง วิธีแก้ไข และมาตรการป้องกันระยะยาว
* สามารถส่งเรื่องต่อให้ **ทีมนำระบบ (PCT, IC, ENV ฯลฯ)** หรือ **หน่วยงานปลายทาง (`sendto_department_id`)** ร่วมทบทวน

### 4️⃣ ศูนย์จัดการ RCA (`/rca/list`)
* **Concise RCA**: สำหรับเคสความรุนแรงระดับปานกลาง (Level E-F) บันทึกทบทวนย่อ 5 หัวข้อ
* **Standard RCA**: สำหรับเคสความรุนแรงสูง / Sentinel Event (Level G-I) ทำ RCA 3 Tiers พร้อมวาด Fishbone Diagram และ 5-Whys Analysis

### 5️⃣ สถิติตารางการรายงานความเสี่ยงรายบุคคล (`/reporting-stats`)
* หน้ารายงานสถิติแยกเฉพาะ
* สามารถกดเลือกดูทีละ **กลุ่มงาน (`departmentgroup`)** หรือกรองรายหน่วยงาน
* แสดงตารางสถิติการส่งรายงานแยกรายบุคคล 12 เดือน (เลือกได้ทั้งปีปฏิทิน ม.ค.-ธ.ค. หรือ ปีงบประมาณ ต.ค.-ก.ย.)
* มีระบบ Heatmap Color, KPI Cards, ปุ่มพิมพ์ตาราง (Print) และส่งออกไฟล์ Excel/CSV (UTF-8 BOM Thai support)

### 6️⃣ ระบบแจ้งเตือนผ่าน Telegram (Department-specific Telegram Bot)
* เมื่อมีเคสใหม่ถูกบันทึก ระบบจะส่งข้อความแจ้งเตือนเข้ากลุ่ม Telegram ของหน่วยงานนั้นๆ โดยอัตโนมัติ
* แต่ละหน่วยงานสามารถตั้งค่า Telegram Bot Token และ Chat ID แยกกันได้อิสระในหน้าจัดการหน่วยงาน

---

## 6. 🗄️ โครงสร้างฐานข้อมูลหลัก (Prisma Database Schema)

* **`riskregister`**: ตารางเก็บรายการอุบัติการณ์ความเสี่ยงทั้งหมด ( id, date_report, department_id, sendto_department_id, level_id, detail, status_risk, created_by ฯลฯ)
* **`member`**: ตารางทะเบียนบุคลากร ( id, cid, name, department_id1, department_id2, position_id ฯลฯ)
* **`user`**: ตารางผู้ใช้งานสำหรับเข้าสู่ระบบ ( id, username, cid, role, department_id, accessrules ฯลฯ)
* **`department`**: ตารางหน่วยงาน/แผนก ( id, depart_name, depart_group_id, telegram_token, telegram_chat_id ฯลฯ)
* **`departmentgroup`**: ตารางกลุ่มงาน/ฝ่ายบริหาร ( id, depart_group_name ฯลฯ)
* **`riskanalysis`**: ตารางทะเบียนความเสี่ยงโรงพยาบาล/หน่วยงาน (Risk Register Profile & 5x5 Score)
* **`rca`**: ตารางบันทึกการวิเคราะห์หาสาเหตุเชิงลึก RCA
* **`incident_review_entry`**: บันทึกผลทบทวนแบบ append-only แยกบทบาท `OWNER`, `CO_REVIEW`, `RM`
* **`capa_action`**: มาตรการ Corrective/Preventive กลาง ใช้ร่วมกันทั้ง RCA และ Non-RCA
* **`capa_effectiveness_review`**: ผลติดตามประสิทธิผลที่แยกจากเอกสาร RCA และหลักฐานการลงมือทำ
* **`sla_policy`, `sla_instance`, `escalation_event`**: กติกา SLA, สถานะ overdue และประวัติการยกระดับ Owner → Head → RM → Executive

---

## 7. 🚀 การเริ่มใช้งานและการสร้างสภาพแวดล้อม (Setup & Deployment Guide)

### 1. การกำหนด Environment Variables (`.env`)

#### ไฟล์ `backend/.env`:
```env
PORT=3000
DATABASE_URL="mysql://root:password@localhost:3306/riskhrms"
JWT_SECRET="<ค่าสุ่มเฉพาะระบบอย่างน้อย 32 ตัวอักษร>"
CORS_ORIGINS="https://hrms.example.go.th"
SWAGGER_ENABLED="false"
AI_ASSISTANT_ENABLED="false"
GEMINI_API_KEY=""
TELEGRAM_BOT_TOKEN="configure-in-secret-manager"
TELEGRAM_CHAT_ID="-100xxxxxxxxx"
```

Frontend ปัจจุบันกำหนด Axios base URL จาก hostname ของหน้าเว็บไปยังพอร์ต `3000` ใน `frontend/src/main.tsx`; หากจะเปลี่ยนไปใช้ Environment Variable ต้องแก้จุดนี้ให้รองรับก่อน
สำหรับ local development ให้ใช้ `http://localhost:5173` เป็น URL มาตรฐานเสมอ เพราะ `localhost` และ `127.0.0.1` เป็นคนละ browser origin และแยก token/localStorage กัน แม้จะเสิร์ฟ frontend ชุดเดียวกัน

### 2. คำสั่งในการรันระบบ (Commands)

#### ฝั่ง Backend (`backend`):
```bash
# ติดตั้ง Packages
npm install

# สร้าง Prisma Client หลังแก้ schema (ไม่เปลี่ยนฐานข้อมูล)
npx prisma generate

# รันระบบเซิร์ฟเวอร์แบบ Development
npm run start:dev

# รันการ Build สำหรับ Production
npm run build
```

#### ฝั่ง Frontend (`frontend`):
```bash
# ติดตั้ง Packages
npm install

# รันระบบเว็บแบบ Development (Port 5173)
npm run dev

# รันการ Build สำหรับ Production (Type-check & Vite Build)
npm run build
```

---

## 8. 🛡️ ข้อควรระวังและการดูแลรักษา (Maintenance & Best Practices)

1. **การสำรองฐานข้อมูล (Database Backup)**:
   * ควรตั้ง Cron Job สำรองฐานข้อมูล MariaDB/MySQL อย่างน้อยวันละ 1 ครั้ง (`mysqldump -u root -p riskhrms > backup.sql`)
2. **การอัปโหลดไฟล์รูปภาพ**:
* รูปภาพที่ผู้ใช้อัปโหลดจะถูกเก็บไว้ที่ `backend/uploads/` และเปิดผ่าน authenticated incident attachment API เท่านั้น ห้ามนำ `/uploads` หรือ `/riskimage` กลับไปเปิดเป็น public static route
   * ชื่อไฟล์ใหม่มี user id ของผู้อัปโหลดนำหน้า และ backend ตรวจ ownership ตอนผูกไฟล์เข้ากับ incident เพื่อป้องกันการนำชื่อไฟล์ของเคสอื่นมาอ้างอิง
3. **การตั้งค่า Telegram Bot**:
   * หากหน่วยงานใดต้องการรับการแจ้งเตือนเข้ากลุ่ม ให้ดึงบอทเข้ากลุ่ม Telegram แล้วนำ Chat ID มาใส่ในหน้า **"ตั้งค่า Telegram รายหน่วยงาน"** ในระบบ
4. **ความถูกต้องของ TypeScript Build**:
   * ก่อน Deploy ให้รัน `npm run build` ทั้งฝั่ง Backend และ Frontend เพื่อยืนยันว่าไม่มี Type Mismatch หรือ Unused Imports เหลืออยู่

### Workflow safety baseline (อัปเดต 28 สิงหาคม 2026)

* `admin` เป็นผู้ดูแลระบบและข้อมูล แต่ไม่มีสิทธิ์ยืนยัน จัดประเภท ทบทวน ระบุว่าไม่ใช่ความเสี่ยง หรือปิดเคสในเชิงวิชาชีพ
* สถานะที่ยืนยันแล้ว (`ตรวจสอบ`) ห้ามปิดข้ามขั้น ต้องมีผลทบทวนอย่างน้อย 1 ครั้งจึงเข้าสู่ `ทบทวน` และปิดได้
* ระดับ A, B และ 1 ปิดได้โดยหัวหน้าหน่วยงานหรือ RM ในขอบเขต ส่วน C–I และ 2–5 ต้องให้ `rm_committee` ปิด; ถ้าระบบระบุว่าต้องทำ RCA ต้องมี RCA ที่เสร็จพร้อม `completed_at`
* เหตุการณ์หลัง NRLS cutover ต้องยืนยัน classification ก่อนเข้าสถานะ `ตรวจสอบ`
* Report API ทุกชุดต้องส่ง `req.user` เข้า service และใช้ record-level scope; ห้ามเพิ่ม raw aggregate query ที่ไม่ผูก scope
* Safe Delete รับ `duplicate_of_incident_id` และเหตุผลอย่างน้อย 10 ตัวอักษร ลบได้เฉพาะรายการซ้ำที่ยืนยันในเดือนปัจจุบันและยังไม่มี Review/RCA/CAPA พร้อมเก็บ snapshot ใน `workflow_audit`
* ก่อน deploy ต้องใช้ migration ถึง `20260828173000_backfill_closed_loop_status` โดยลำดับ P2 คือ `20260828170000_closed_loop_review_capa_sla` และ `20260828173000_backfill_closed_loop_status`; local database วันที่ 28 สิงหาคม 2026 ใช้ครบแล้วและ `prisma migrate status` รายงานว่า up to date
* Production จะไม่เริ่มทำงานถ้า `JWT_SECRET` ว่าง สั้นกว่า 32 ตัวอักษร หรือเป็นค่า placeholder เดิม; local development จะสร้างคีย์สุ่มในไฟล์ `.riskhrms-dev-jwt-secret` ที่ Git ไม่ติดตามโดยอัตโนมัติ กำหนด `CORS_ORIGINS` เป็น origin จริงแบบคั่นด้วย comma และ Swagger จะปิดใน production เว้นแต่ตั้ง `SWAGGER_ENABLED=true`
* AI ช่วยร่างรายงานเป็น external processing จึงปิดเป็นค่าเริ่มต้น เปิดได้เมื่อโรงพยาบาลอนุมัตินโยบายแล้วโดยตั้ง `AI_ASSISTANT_ENABLED=true` และ `GEMINI_API_KEY`; server จะปกปิด HN/AN/CID/ชื่อ/โทรศัพท์เบื้องต้นก่อนส่งออก

### P2 closed-loop Review / RCA / CAPA (อัปเดต 28 สิงหาคม 2026)

* หน้า `/capa` เป็น workspace กลางสำหรับ CAPA จาก Mini/Concise/Standard RCA และ Non-RCA โดยใช้สถานะเดียวกัน: `PENDING` → `IN_PROGRESS` → `AWAITING_EFFECTIVENESS` → `AWAITING_APPROVAL` → `CLOSED`; ผลไม่ผ่านจะย้อนเป็น `REWORK` และเพิ่ม revision
* การยืนยันว่า “ดำเนินมาตรการแล้ว” ต้องมี evidence, effectiveness criteria, target และ effectiveness due date และยังไม่ถือว่าปิด CAPA
* ผู้ดำเนินมาตรการหรือผู้ยืนยัน implementation ห้ามเป็นผู้ทำ Effectiveness review ของมาตรการเดียวกัน; ต้องมีค่าที่วัดได้หรือหลักฐาน และห้ามประเมินก่อนครบช่วงติดตาม
* เฉพาะ `rm_committee` ในขอบเขตที่รับผิดชอบเท่านั้นที่อนุมัติ `CLOSED`; `admin` ดูข้อมูลได้แต่ทำ clinical decision ไม่ได้
* `riskregister.operational_closed_at` แยกการจำหน่ายเคสออกจาก `effectiveness_closed_at`; เคสสามารถจำหน่ายเชิงปฏิบัติการได้แต่ `improvement_status = MONITORING` จน CAPA ทุกข้อผ่านและ RM ปิด
* เอกสาร RCA ใช้ `rca_status = COMPLETED` เฉพาะความสมบูรณ์ของเอกสาร ไม่ใช้แทนผลหลังติดตาม
* Scheduled escalation ประมวลผลทุก 30 นาทีและบันทึก `notification_log`/`escalation_event`; endpoint ไม่มี JWT ถูกปฏิเสธด้วย HTTP 401 แล้ว
* Backup ก่อน migration อยู่ที่ `backend/backups/p2-closed-loop-2026-08-28T04-41-08-224Z.json` (4,798 incidents, 4,183 reviews, RCA 6 ฉบับ)
* Verification ล่าสุด: Backend build ผ่าน, Jest 13 suites / 67 tests ผ่าน, Frontend production build ผ่าน, browser smoke test `/capa` ที่ไม่ login ถูก redirect ไป `/login`

---

*เอกสารต้นฉบับจัดทำเมื่อ: 22 สิงหาคม 2026 — อัปเดตสถานะล่าสุด: 28 สิงหาคม 2026*
*ระบบ riskHRMS - โรงพยาบาลวังเจ้า*
