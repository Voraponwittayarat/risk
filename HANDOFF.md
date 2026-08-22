# 📘 เอกสารส่งต่อระบบ (System Hand-off & Architecture Document)
## ระบบบริหารจัดการความเสี่ยงและอุบัติการณ์ รพ.วังเจ้า (riskHRMS)

---

## 1. 🌟 ภาพรวมระบบ (System Overview)

**riskHRMS** เป็นระบบบริหารจัดการความเสี่ยง อุบัติการณ์ และความปลอดภัยผู้ป่วย (Patient Safety & Enterprise Risk Management) ของโรงพยาบาลวังเจ้า ถูกออกแบบมาเพื่อรองรับกระบวนการแจ้งเหตุความเสี่ยง การตรวจสอบยืนยัน การทบทวนเคส การวิเคราะห์สาเหตุเชิงลึก (RCA - Root Cause Analysis) การทบทวนเวชระเบียน (Trigger Tool) ตลอดจนการสรุปผลสถิติตารางการรายงานความเสี่ยงรายบุคคลประจำเดือนและการแจ้งเตือนอัตโนมัติผ่าน Telegram

---

## 2. 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack & Architecture)

### 💻 Frontend Architecture
* **Framework**: React 18 + Vite (TypeScript)
* **Styling**: Tailwind CSS (v4) + Custom UI Design System
* **Icons**: Lucide React Icons
* **State & Routing**: React Context API (`AuthContext`) + React Router DOM v6
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

ระบบถูกออกแบบให้เชื่อมโยงหน่วยงานใน **5 ลักษณะหลัก**:

1. **`riskregister.department_id` (หน่วยงานผู้ค้นพบ/ผู้บันทึกรายงาน)**:
   * ดึงจาก **`member.department_id1`** ของผู้รายงานโดยอัตโนมัติเมื่อกดส่งรายงาน
   * ใช้เป็นหน่วยงานตั้งต้นสำหรับให้ **Manager และ หัวหน้าหน่วยงานในแผนกเดียวกัน** เห็นและกดยืนยันความเสี่ยงด่านแรก
2. **`riskregister.sendto_department_id` (หน่วยงานปลายทางส่งต่อ/ร่วมทบทวน)**:
   * กรณีความเสี่ยงส่งผลกระทบข้ามแผนก หัวหน้างานสามารถเลือกส่งต่อเรื่องให้หน่วยงานปลายทางร่วมแก้ไขและบันทึกมาตรการป้องกัน
3. **`departmentgroup` (กลุ่มงาน)**:
   * รวบรวมหลายหน่วยงานย่อย (เช่น *กลุ่มงานการพยาบาล*, *กลุ่มงานบริหารทั่วไป*) ใช้ในสิทธิ์ทบทวนของหัวหน้ากลุ่มงาน (Head of Group) และการสกัดสถิติตารางรายบุคคล

### 🔐 ระดับสิทธิ์และการเข้าถึง (Role Hierarchy)
* **`staff` (เจ้าหน้าที่ทั่วไป)**: สามารถบันทึกความเสี่ยง ดูความเสี่ยงที่ตนเองรายงาน (`/my-reported`) และสถิติสเกลภาพรวม
* **`head` / Manager (`priority = '1'`)**: หัวหน้าหน่วยงาน สามารถตรวจสอบ/ยืนยันความเสี่ยงของแผนกตนเอง (`/incidents/pending`) บันทึกการทบทวน และส่งต่อเรื่องข้ามแผนกได้
* **`head of group`**: หัวหน้ากลุ่มงาน สามารถเห็นและติดตามความเสี่ยงของทุกหน่วยงานย่อยที่สังกัดอยู่ในกลุ่มงานตนเอง
* **`rm_committee` / `admin`**: ศูนย์ RM และผู้ดูแลระบบ มีสิทธิ์เต็มในการจัดการความเสี่ยงทุกหน่วยงาน การตั้งค่าระบบ สิทธิ์ผู้ใช้งาน ทะเบียนความเสี่ยง และการส่งออกรายงาน

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
* สามารถแก้ไขระดับความรุนแรง (Level A-I) หรือปรับเปลี่ยนหน่วยงานรับผิดชอบได้

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

---

## 7. 🚀 การเริ่มใช้งานและการสร้างสภาพแวดล้อม (Setup & Deployment Guide)

### 1. การกำหนด Environment Variables (`.env`)

#### ไฟล์ `backend/.env`:
```env
PORT=3000
DATABASE_URL="mysql://root:password@localhost:3306/riskhrms"
JWT_SECRET="your-super-secret-jwt-key"
TELEGRAM_BOT_TOKEN="8866061704:AAGdyH0MvzUsnzVWrSqh0V5wZLgCO4iJq6Q"
TELEGRAM_CHAT_ID="-100xxxxxxxxx"
```

#### ไฟล์ `frontend/.env`:
```env
VITE_API_BASE_URL="http://localhost:3000"
```

### 2. คำสั่งในการรันระบบ (Commands)

#### ฝั่ง Backend (`backend`):
```bash
# ติดตั้ง Packages
npm install

# อัปเดต Schema ไปยังฐานข้อมูล
npx prisma db push

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
   * รูปภาพที่ผู้ใช้อัปโหลดจะถูกเก็บไว้ที่ `backend/uploads/` ควรตรวจสอบพื้นที่ดิสก์เป็นประจำ
3. **การตั้งค่า Telegram Bot**:
   * หากหน่วยงานใดต้องการรับการแจ้งเตือนเข้ากลุ่ม ให้ดึงบอทเข้ากลุ่ม Telegram แล้วนำ Chat ID มาใส่ในหน้า **"ตั้งค่า Telegram รายหน่วยงาน"** ในระบบ
4. **ความถูกต้องของ TypeScript Build**:
   * ก่อน Deploy ให้รัน `npm run build` ทั้งฝั่ง Backend และ Frontend เพื่อยืนยันว่าไม่มี Type Mismatch หรือ Unused Imports เหลืออยู่

---

*เอกสารส่งต่อระบบจัดทำขึ้นเมื่อ: 22 สิงหาคม 2026*  
*ระบบ riskHRMS - โรงพยาบาลวังเจ้า*
