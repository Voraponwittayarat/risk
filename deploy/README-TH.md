# คู่มือติดตั้งและอัปเดต RiskHRMS บน Windows Server

ชุดนี้ออกแบบสำหรับเครื่องเซิร์ฟเวอร์ Windows ภายในโรงพยาบาล โดยใช้ Git เป็นแหล่งโค้ด, MariaDB เป็นฐานข้อมูล, Node.js สำหรับ build/run และ PM2 ดูแล process ตลอดเวลา หน้า React ที่ build แล้วจะถูก NestJS ให้บริการร่วมกับ API ผ่านพอร์ตเดียว (ค่าเริ่มต้น `3000`)

## โครงสร้างที่แนะนำ

```text
เครื่องพัฒนา/AI Agent
  feature branch -> build/test -> commit -> push -> review/merge origin/main
                                      |
                                      v
เครื่อง Production Server
  Update-HRMS.ps1 -> backup DB -> git pull --ff-only -> build
                  -> prisma migrate deploy -> PM2 reload -> /health
```

อย่าแก้ production โดยตรงเป็นวิธีปกติ ให้พัฒนาและทดสอบบนเครื่องพัฒนาก่อน แล้วจึง merge เข้า `main` เครื่อง production มีหน้าที่รับ release ที่อนุมัติแล้ว หาก AI Agent อยู่บนเครื่องเดียวกับ production ให้ใช้ repository คนละโฟลเดอร์: `D:\RiskHRMS-work` สำหรับ Agent และ `D:\RiskHRMS` สำหรับระบบที่กำลังให้บริการ

## สิ่งที่ต้องติดตั้งบน Server

- Windows Server 2022 หรือ Windows 11 รุ่นที่ได้รับ security updates
- Git for Windows
- Node.js 22.12 ขึ้นไป (แนะนำรุ่น LTS ที่องค์กรอนุมัติ)
- MariaDB Server และ MariaDB Client (`mariadb-dump` ต้องอยู่ใน `PATH`)
- สิทธิอ่าน repository `https://github.com/riskwangchao/HRMS2026.git`
- บัญชี Windows เฉพาะสำหรับรัน RiskHRMS และ PM2; ไม่ใช้บัญชีผู้ดูแลระบบเพื่อรันงานประจำ
- พื้นที่เก็บ backup ที่มีการจำกัดสิทธิและสำรองออกนอกเครื่อง

ก่อนเปิดใช้งานจริงควรมีชื่อ DNS และ HTTPS ผ่าน IIS/Caddy/reverse proxy พร้อมจำกัด firewall ให้เฉพาะเครือข่ายโรงพยาบาล หลีกเลี่ยงการเปิดพอร์ตฐานข้อมูล `3306` ออกนอกเครื่อง

## ติดตั้งครั้งแรก

### 1. Clone repository

เปิด PowerShell ด้วยบัญชี service ของ RiskHRMS:

```powershell
git clone https://github.com/riskwangchao/HRMS2026.git D:\RiskHRMS
Set-Location -LiteralPath D:\RiskHRMS
git switch main
git pull --ff-only origin main
```

ถ้าองค์กรใช้ private repository ให้ตั้ง Git credential ของบัญชี service ก่อน และให้สิทธิเท่าที่จำเป็น

ถ้าจะใช้ AI Agent บนเครื่องเดียวกัน ให้ clone workspace แยกอีกชุด ห้ามชี้ Agent ไปแก้ production checkout:

```powershell
git clone https://github.com/riskwangchao/HRMS2026.git D:\RiskHRMS-work
```

### 2. เตรียมฐานข้อมูลและไฟล์ `.env`

สร้างฐานข้อมูล MariaDB และผู้ใช้เฉพาะของ RiskHRMS ตามนโยบาย DBA จากนั้นคัดลอก template:

```powershell
Copy-Item -LiteralPath .\deploy\templates\backend.env.production.example -Destination .\backend\.env
notepad .\backend\.env
```

แก้ทุกค่า `CHANGE_ME` และตรวจอย่างน้อย:

- `DATABASE_URL` ชี้ฐานข้อมูล production ที่ถูกต้อง
- `JWT_SECRET` เป็นค่าสุ่มอย่างน้อย 32 ตัวอักษรและไม่ใช้ซ้ำกับเครื่องพัฒนา
- `UPLOAD_DIR` อยู่นอก Git repository และบัญชี service เขียนได้
- `AI_ASSISTANT_ENABLED=false` จนกว่าโรงพยาบาลอนุมัตินโยบายส่งข้อมูลไปผู้ให้บริการ AI ภายนอก
- token/email/Telegram ใช้ credential ของ production ใหม่ ไม่คัดลอกจากเครื่องพัฒนา

ไฟล์ `backend/.env` ถูก ignore โดย Git อยู่แล้ว ห้ามแนบไฟล์นี้ในแชตหรือ commit เด็ดขาด ควรหมุนเวียน JWT, Gemini, SMTP, LINE และ Telegram credentials เดิมก่อนนำระบบ production ใหม่ขึ้นใช้

### 3. ติดตั้ง Build, Migration และเริ่มระบบ

ต้องให้ worktree สะอาดก่อน:

```powershell
git status --short
powershell -ExecutionPolicy Bypass -File .\deploy\windows\Install-HRMS.ps1
```

สคริปต์จะ:

1. ตรวจ Node/Git/npm และ `.env`
2. ติดตั้ง dependency จาก lock file ด้วย `npm ci`
3. build frontend/backend
4. สำรองฐานข้อมูลพร้อม SHA-256
5. ใช้ `prisma migrate deploy`
6. เริ่ม/รีโหลด `risk-hrms` ด้วย PM2
7. ตรวจ `http://127.0.0.1:3000/health`

ตรวจสถานะเพิ่มเติม:

```powershell
pm2 status
pm2 logs risk-hrms --lines 100
Invoke-RestMethod http://127.0.0.1:3000/health -Headers @{ Accept = 'application/json' }
```

หลังติดตั้ง ให้ลงทะเบียน PM2 resurrect เป็น Windows startup task ภายใต้บัญชี service เดิม (`pm2 save` ถูกเรียกจากสคริปต์ติดตั้งแล้ว):

```powershell
# เปิด PowerShell แบบ Run as administrator ด้วยบัญชี service ของ RiskHRMS
powershell -ExecutionPolicy Bypass -File .\deploy\windows\Register-HRMSStartupTask.ps1
```

สคริปต์จะถามรหัสผ่านบัญชี service ผ่านหน้าต่าง credential ของ Windows และไม่บันทึกรหัสผ่านลง repository จากนั้นให้ทดสอบ reboot หนึ่งครั้งใน maintenance window และตรวจ `pm2 status` กับ `/health`

## ขั้นตอนอัปเดตประจำ

### ฝั่งเครื่องพัฒนา

1. สร้าง feature branch
2. แก้ไขและทดสอบ
3. รัน `npm run build` ทั้ง frontend และ backend
4. commit/push และ review
5. merge เข้า `origin/main`

ห้ามเก็บงานที่แก้เฉพาะบน production เพราะจะทำให้ update script หยุดเมื่อเจอ dirty worktree

### ฝั่ง Production Server

```powershell
Set-Location -LiteralPath D:\RiskHRMS
git status --short
powershell -ExecutionPolicy Bypass -File .\deploy\windows\Update-HRMS.ps1
```

Update script จะยอมทำงานเมื่อ:

- อยู่ branch `main`
- worktree สะอาด
- production ไม่ได้มี commit ที่ยังไม่อยู่บน `origin/main`
- สำรองฐานข้อมูลสำเร็จและตรวจพบไฟล์ dump จริง

ค่าเริ่มต้น backup อยู่ที่ `%ProgramData%\RiskHRMS\backups` และสถานะ release ล่าสุดอยู่ที่ `%ProgramData%\RiskHRMS\state\last-successful-deploy.json` ควรให้โฟลเดอร์ backup อยู่บน volume ที่เข้ารหัสและจำกัด ACL เฉพาะ DBA/บัญชีสำรองข้อมูล

หาก build/migration/health check ล้มเหลว สคริปต์จะหยุดและไม่ restore ฐานข้อมูลหรือ reset Git อัตโนมัติ เพื่อไม่ทำลายข้อมูล ให้เก็บข้อความผิดพลาด, commit ก่อนหน้า และตำแหน่ง backup แล้วส่งให้ผู้ดูแล/AI Agent วิเคราะห์ก่อนทำขั้นตอนถัดไป

## สำรองข้อมูลแยกต่างหาก

สำรองเฉพาะฐานข้อมูล:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\Backup-HRMS.ps1
```

สำรองฐานข้อมูลและ uploads:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\Backup-HRMS.ps1 -IncludeUploads
```

ทุก dump มี manifest `.json` ระบุ commit, เวลา, ขนาด และ SHA-256 ควรตั้ง scheduled backup รายวันและคัดลอกแบบเข้ารหัสไปอีกเครื่องหนึ่ง จากนั้นทดสอบ restore ในฐานข้อมูลทดสอบเป็นระยะ การมีไฟล์ backup โดยไม่เคยทดสอบ restore ยังไม่ถือว่ามีแผนกู้คืนที่พร้อมใช้

## การย้อนกลับเมื่อ release มีปัญหา

- ถ้ายังไม่ได้ PM2 reload: service เก่ามักยังทำงานอยู่ ห้ามรีบ reboot และห้ามรันคำสั่งซ้ำแบบเดา
- ถ้า reload แล้วแต่ health fail: เก็บ `pm2 logs`, commit ปัจจุบัน, commit ก่อนหน้า และ backup manifest
- การย้อน code ให้ AI Agent/ผู้ดูแลสร้าง release revert ที่ตรวจสอบได้ แล้ว deploy ใหม่
- การ restore ฐานข้อมูลเป็นงานทำลายข้อมูลหลังเวลาที่ backup ถูกสร้าง ต้องได้รับอนุมัติจากผู้รับผิดชอบระบบ/DBA และทำตาม runbook เฉพาะเหตุการณ์ ห้ามให้ Agent restore อัตโนมัติ

## ใช้ AI Agent ดูแลระบบ

- วาง Agent ที่โฟลเดอร์ราก `D:\RiskHRMS-work` และสงวน `D:\RiskHRMS` ไว้สำหรับ production updater เท่านั้น
- ถ้า Agent รองรับ `AGENTS.md` ระบบจะอ่านข้อกำหนดของ repository โดยอัตโนมัติ
- สำหรับ Agent อื่น ให้คัดลอก `deploy/AI_AGENT_MASTER_PROMPT_TH.md` เป็น system/master prompt
- ให้ Agent แก้โค้ดบน feature branch และหยุดที่ “พร้อม deploy” จนกว่าจะได้รับคำสั่งชัดเจน
- ห้ามให้ Agent อ่านหรือส่งออก `.env`, dump, uploads หรือ incident จริงโดยไม่จำเป็น
- การ deploy ต้องใช้ `Update-HRMS.ps1` เท่านั้นเพื่อให้มี backup และ audit trail

## Checklist หลังติดตั้ง/อัปเดต

- `/health` ตอบ `status: ok` และ `database: connected`
- `pm2 status` เป็น `online`
- เข้า login ผ่าน hostname จริงได้
- เปิดรายการ incident แบบ read-only ได้
- เปิดหน้าที่เพิ่งแก้และทดสอบกรณีสำคัญ
- ไม่มี error ใหม่ใน `pm2 logs risk-hrms`
- มี dump + manifest + SHA-256 ของ release นี้
- บันทึก commit ที่ deploy และเวลาที่ตรวจสอบ
