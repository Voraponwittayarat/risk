# คู่มือติดตั้งและอัปเดต RiskHRMS บน Ubuntu Server

แนวทางนี้ใช้ Ubuntu + MariaDB + Node.js + systemd + Nginx โดยพัฒนาและทดสอบบนเครื่อง development ส่วน Server มี checkout production เพียงชุดเดียว:

- เครื่อง development — แก้ไข ทดสอบ commit และ push เข้า GitHub
- `/opt/riskhrms` — Production checkout รับเฉพาะ release จาก `origin/main` และห้ามแก้ source code โดยตรง

ระบบ production ฟังเฉพาะ `127.0.0.1:3000`; Nginx รับ HTTP/HTTPS จากผู้ใช้แล้ว reverse proxy เข้ามา จึงไม่ต้องเปิดพอร์ต Node `3000` หรือ MariaDB `3306` สู่เครือข่าย

## 1. สิ่งที่ต้องติดตั้ง

- Ubuntu Server 22.04/24.04 LTS ที่ยังได้รับ security updates
- Node.js 22.12 ขึ้นไปจากแหล่ง package ที่ฝ่าย IT อนุมัติ
- Git, curl, MariaDB Server/Client และ Nginx
- DNS/ใบรับรอง TLS ของโรงพยาบาล
- Git deploy key แบบ read-only สำหรับ production และ credential แยกสำหรับ AI workspace

แพ็กเกจพื้นฐาน:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates mariadb-server mariadb-client nginx build-essential python3
node --version
npm --version
```

ถ้า Node ต่ำกว่า 22.12 ให้ติดตั้ง Node LTS จาก repository ที่องค์กรอนุมัติก่อนดำเนินการต่อ

## 2. สร้างบัญชีและ clone production

```bash
sudo useradd --system --home-dir /var/lib/riskhrms --create-home --shell /usr/sbin/nologin riskhrms
sudo install -d -o riskhrms -g riskhrms -m 0750 /opt/riskhrms
sudo -u riskhrms -H git clone https://github.com/riskwangchao/HRMS2026.git /opt/riskhrms
sudo -u riskhrms -H git -C /opt/riskhrms switch main
```

กรณี repository เป็น private ให้ตั้ง read-only SSH deploy key ให้บัญชี `riskhrms` และใช้ SSH remote ห้ามเก็บ GitHub password/token ไว้ใน script

การพัฒนาต้องทำจากเครื่อง development ที่ผู้ดูแลกำหนด ไม่ต้องสร้าง AI workspace สำหรับแก้โค้ดบน production Server

## 3. เตรียม MariaDB และ production environment

ให้ DBA สร้างฐานข้อมูล `riskhospital` และผู้ใช้เฉพาะของแอป/การ migration ตามนโยบายองค์กร ห้ามเปิดพอร์ต `3306` ออกอินเทอร์เน็ต

คัดลอก environment template:

```bash
sudo install -o riskhrms -g riskhrms -m 0600 \
  /opt/riskhrms/deploy/templates/backend.env.ubuntu.example \
  /opt/riskhrms/backend/.env
sudoedit /opt/riskhrms/backend/.env
```

แก้ทุกค่า `CHANGE_ME` และตรวจว่า:

- `DATABASE_URL` เป็นฐานข้อมูล production และมีสิทธิที่จำเป็นต่อ migration
- ถ้า DBA แยกบัญชีสำรองข้อมูล ให้ใส่ `BACKUP_DATABASE_URL`; หากปล่อยว่างสคริปต์จะใช้ `DATABASE_URL`
- `JWT_SECRET` เป็นค่าสุ่มใหม่อย่างน้อย 32 ตัวอักษร
- `HOST=127.0.0.1`
- `UPLOAD_DIR=/var/lib/riskhrms/uploads`
- `AI_ASSISTANT_ENABLED=false` จนกว่าโรงพยาบาลอนุมัตินโยบายส่งข้อมูลไป AI ภายนอก
- Gemini/SMTP/LINE/Telegram ใช้ production credentials ใหม่ ไม่ใช้ค่าจากเครื่องพัฒนา

ไฟล์ `.env`, dumps และ uploads มีข้อมูลอ่อนไหว ห้าม commit แนบแชต หรือให้ Agent ส่งออกนอกระบบ

## 4. ติดตั้งระบบครั้งแรก

Production checkout ต้องสะอาด:

```bash
sudo -u riskhrms -H git -C /opt/riskhrms status --short
sudo bash /opt/riskhrms/deploy/ubuntu/install-hrms.sh
```

Installer จะตรวจ environment, build frontend/backend, สำรองฐานข้อมูล, ใช้ `prisma migrate deploy`, ติดตั้ง `riskhrms.service`, เปิดใช้งานตอน boot และตรวจ `/health`

ตรวจระบบ:

```bash
sudo systemctl status riskhrms --no-pager
sudo journalctl -u riskhrms -n 100 --no-pager
curl -fsS -H 'Accept: application/json' http://127.0.0.1:3000/health
```

## 5. ตั้ง Nginx และ HTTPS

คัดลอก template แล้วเปลี่ยน `server_name` ให้เป็น DNS จริง:

```bash
sudo cp /opt/riskhrms/deploy/ubuntu/nginx-riskhrms.conf.example /etc/nginx/sites-available/riskhrms
sudoedit /etc/nginx/sites-available/riskhrms
sudo ln -s /etc/nginx/sites-available/riskhrms /etc/nginx/sites-enabled/riskhrms
sudo nginx -t
sudo systemctl reload nginx
```

ติดตั้งใบรับรอง TLS ตามมาตรฐานของโรงพยาบาลหรือใช้ Certbot เมื่อ DNS/นโยบายเครือข่ายรองรับ เปิด firewall เฉพาะ `80/443` จากเครือข่ายที่ไว้ใจ ไม่เปิด `3000/3306` ภายนอก localhost

## 6. ขั้นตอนแก้ไขและอัปเดตต่อเนื่อง

ผู้พัฒนาทำงานบนเครื่อง development:

1. อ่าน `AGENTS.md` และคู่มือที่เกี่ยวข้อง
2. สร้าง feature branch สำหรับงานนั้น
3. แก้และรัน build/test ทั้ง frontend/backend
4. commit แล้ว review/merge เข้า `main`
5. push `main` ไป GitHub เพื่อให้ Server ตรวจพบและ auto deploy

เมื่ออนุมัติ production:

```bash
sudo bash /opt/riskhrms/deploy/ubuntu/update-hrms.sh
```

Updater จะทำงานเฉพาะเมื่อ production อยู่ branch `main`, worktree สะอาด และไม่มี commit เฉพาะเครื่อง จากนั้นจะสำรอง DB → fast-forward pull → build → migrate → restart systemd → health check

สถานะ release ล่าสุดอยู่ที่ `/var/lib/riskhrms/deploy-state/last-successful-deploy.json`

### Deploy อัตโนมัติเมื่อ push เข้า main

การพัฒนาและแก้ไขทั้งหมดทำบนเครื่อง development เมื่อ build/test ผ่านแล้วจึง merge และ push เข้า `origin/main` การ push เข้า `main` ถือเป็นการอนุมัติ release สำหรับ production

บน production มีตัวตรวจทุก 5 นาที ทำหน้าที่ fetch `origin/main` หากพบ commit ใหม่จึงเรียก updater เดิมเพียงคำสั่งเดียว:

```bash
sudo -n bash /opt/riskhrms/deploy/ubuntu/update-hrms.sh
```

ติดตั้งหรืออัปเดตตัวตรวจจากไฟล์ที่ version control ใน repository:

```bash
sudo bash /opt/riskhrms/deploy/ubuntu/install-auto-deploy.sh
```

Updater ล็อกไม่ให้ deploy ซ้อนกัน ตรวจว่า production checkout สะอาดและอยู่ branch `main` จากนั้นสำรองฐานข้อมูลพร้อม checksum, pull แบบ fast-forward, build, ใช้ `prisma migrate deploy`, restart และตรวจ `/health`

Server ต้องใช้ GitHub deploy key แบบ read-only สำหรับ fetch repository ตัวตรวจใช้ GitHub SSH ผ่าน port 443 พร้อม keepalive และ retry 3 ครั้ง เพื่อรองรับเครือข่ายที่ตัดการเชื่อมต่อ port 22 หากเป็น network failure จะลองใหม่ใน timer รอบถัดไปและไม่สร้าง block ถาวร ส่วน unsafe state, updater failure หรือ health failure ยังคงสร้าง block เพื่อรอการตรวจสอบ ไม่ต้องเปิด SSH ให้ GitHub Actions และไม่ต้องตั้ง `PROD_HOST`, `PROD_PORT`, `PROD_USER`, `PROD_SSH_KEY` หรือ `PROD_KNOWN_HOSTS`

ตัวตรวจต้องบันทึก commit, เวลาเริ่ม/จบ, ผล updater, backup path และ health result โดยต้องไม่บันทึก secrets หรือข้อมูลผู้ป่วย หาก updater ล้มเหลวให้คง service เดิมเท่าที่ทำได้และแจ้งผู้ดูแล ห้าม reset Git, restore ฐานข้อมูล หรือรัน migration/restart ซ้ำแบบเดาสุ่ม

### การตรวจสอบ Server ผ่าน Tailscale

ผู้ดูแลหรือ Agent จากเครื่อง development สามารถ SSH เข้า production ผ่าน Tailscale เพื่ออ่านสถานะและวิเคราะห์ปัญหา เช่น ตรวจ running commit, `git status`, deploy state, `systemctl`, `/health` และ log ที่เกี่ยวข้อง โดยต้องไม่คัดลอก secrets, ข้อมูลผู้ป่วย หรือ log ที่อาจระบุตัวบุคคลออกจาก Server

ห้ามแก้ source code, migration, deployment script หรือ tracked configuration โดยตรงใน `/opt/riskhrms` ผ่าน SSH หากพบปัญหาให้แก้บนเครื่อง development แล้ว commit/push ผ่าน GitHub จากนั้นให้ตัวตรวจบน Server นำ commit ใหม่ไป deploy

ไฟล์ลับเฉพาะ Server เช่น `backend/.env` ไม่อยู่ใน Git ห้ามนำเข้า repository และให้เปลี่ยนเฉพาะเมื่อผู้ดูแลสั่งอย่างชัดเจน

## 7. สำรองข้อมูล

ฐานข้อมูล:

```bash
sudo bash /opt/riskhrms/deploy/ubuntu/backup-hrms.sh
```

ฐานข้อมูลและ uploads:

```bash
sudo bash /opt/riskhrms/deploy/ubuntu/backup-hrms.sh --include-uploads
```

ค่าเริ่มต้นเก็บใน `/var/backups/riskhrms` ด้วย permission `0700/0600` พร้อม manifest และ SHA-256 ควรวาง filesystem นี้บน volume ที่เข้ารหัส สำรองไปอีกเครื่อง และทดสอบ restore ในฐานข้อมูลทดสอบเป็นระยะ

## 8. เมื่ออัปเดตล้มเหลว

- Script ไม่ `git reset` และไม่ restore ฐานข้อมูลอัตโนมัติ
- เก็บ `systemctl status`, `journalctl`, commit ก่อนหน้า และ backup manifest
- ห้าม reboot หรือรัน migrate/restart ซ้ำแบบเดา
- ให้สร้าง release revert ที่ตรวจสอบได้จาก AI workspace แล้ว deploy ใหม่
- การ restore DB ต้องได้รับอนุมัติจาก DBA เพราะจะทับข้อมูลที่เกิดหลังเวลาสำรอง

## 9. Checklist หลัง Deploy

- `systemctl is-active riskhrms` เป็น `active`
- `/health` ตอบ `status=ok`, `database=connected`
- Nginx HTTPS เปิด login ได้
- เปิดรายการ incident แบบ read-only ได้
- หน้าที่แก้ทำงานตามกรณีทดสอบ
- ไม่มี error ใหม่ใน `journalctl -u riskhrms`
- มี DB dump, manifest, SHA-256 และ commit ของ release
