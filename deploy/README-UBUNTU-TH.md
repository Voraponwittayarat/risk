# คู่มือติดตั้งและอัปเดต RiskHRMS บน Ubuntu Server

แนวทางนี้ใช้ Ubuntu + MariaDB + Node.js + systemd + Nginx โดยแยก checkout สองชุดบนเครื่องเดียวกัน:

- `/opt/riskhrms-work` — AI Agent แก้ไข ทดสอบ commit และ push feature branch
- `/opt/riskhrms` — Production checkout รับเฉพาะ release จาก `origin/main`

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

สร้าง AI workspace ด้วยบัญชีผู้ดูแล Agent ซึ่งต้องไม่ใช่บัญชี `riskhrms`:

```bash
sudo install -d -o <agent-user> -g <agent-user> -m 0750 /opt/riskhrms-work
sudo -u <agent-user> -H git clone https://github.com/riskwangchao/HRMS2026.git /opt/riskhrms-work
```

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

AI Agent ทำงานใน `/opt/riskhrms-work`:

1. อ่าน `AGENTS.md` และ Master Prompt ฉบับ Ubuntu
2. สร้าง branch `ai/YYYYMMDD-topic`
3. แก้และรัน build/test ทั้ง frontend/backend
4. commit/push แล้ว review/merge เข้า `origin/main`
5. หยุดรอคำสั่ง deploy

เมื่ออนุมัติ production:

```bash
sudo bash /opt/riskhrms/deploy/ubuntu/update-hrms.sh
```

Updater จะทำงานเฉพาะเมื่อ production อยู่ branch `main`, worktree สะอาด และไม่มี commit เฉพาะเครื่อง จากนั้นจะสำรอง DB → fast-forward pull → build → migrate → restart systemd → health check

สถานะ release ล่าสุดอยู่ที่ `/var/lib/riskhrms/deploy-state/last-successful-deploy.json`

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
