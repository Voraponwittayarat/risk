# คู่มือติดตั้งและอัปเดต RiskHRMS แบบ Docker

นี่คือทางเลือกเสริมของโหมด Ubuntu + systemd ใน `deploy/README-UBUNTU-TH.md` — เลือกใช้ **อย่างใดอย่างหนึ่งต่อหนึ่งเซิร์ฟเวอร์** อย่าติดตั้งทั้งสองโหมดพร้อมกัน

ขอบเขตเดิมทั้งหมดยังใช้ได้: แอปพลิเคชันชุดเดียว (NestJS เสิร์ฟทั้ง API และ frontend ที่คอมไพล์แล้วบนพอร์ตเดียว), ฐานข้อมูล MariaDB/MySQL ผ่าน Prisma และ Nginx บน host ยังคงเป็นผู้รับ HTTP/HTTPS และทำ TLS เหมือนเดิม โดย reverse proxy ไปที่ `127.0.0.1:3000`

สิ่งที่ต่างจากโหมด systemd:

- แอปและ MariaDB ทำงานใน container แทน systemd service และ MariaDB บน host
- image ประกอบจาก `deploy/docker/Dockerfile` (Node 22, multi-stage build) และรัน `prisma migrate deploy` เฉพาะ migration ที่ review แล้วใน repository ทุกครั้งที่ container เริ่มทำงาน (ไม่ใช้ `prisma db push`)
- โหมดนี้ไม่ผูกกับตัวตรวจ auto-deploy ทุก 5 นาที (`riskhrms-auto-deploy.timer` เรียก updater ของโหมด systemd) — การอัปเดตใช้สคริปต์ `update-hrms-docker.sh` ตามหัวข้อ 6

## 1. สิ่งที่ต้องติดตั้ง

- Ubuntu Server 22.04/24.04 LTS ที่ยังได้รับ security updates
- Docker Engine และ Docker Compose plugin v2 ขึ้นไป (ทดสอบกับ Engine 27+)
- Git, curl, Nginx และ DNS/ใบรับรอง TLS ของโรงพยาบาล

```bash
docker --version
docker compose version
```

## 2. สร้างบัญชีและ clone production

```bash
sudo useradd --system --home-dir /var/lib/riskhrms --create-home --shell /usr/sbin/nologin riskhrms
sudo install -d -o riskhrms -g riskhrms -m 0755 /opt/riskhrms
sudo -u riskhrms -H git clone https://github.com/riskwangchao/HRMS2026.git /opt/riskhrms
sudo -u riskhrms -H git -C /opt/riskhrms switch main
```

กรณี repository เป็น private ให้ตั้ง read-only SSH deploy key ให้บัญชี `riskhrms` เหมือนโหมด systemd การแก้โค้ดทั้งหมดทำบนเครื่อง development แล้ว push เข้า `origin/main` เท่านั้น ห้ามแก้ source ใน `/opt/riskhrms`

วาง checkout ไว้ที่อื่นแทน `/opt/riskhrms` ก็ได้ — สคริปต์ทั้งหมดอิงตำแหน่งสัมพัทธ์ของตัวเอง แค่เปลี่ยน path ในคำสั่งให้ตรง แต่**ห้ามวางใน web docroot ที่ Apache/Nginx serve เป็น static file อยู่** (เช่น `/var/www/html`) เพราะจะทำให้ `deploy/docker/db/*.sql` (dump ฐานข้อมูลจริง) และไฟล์ `.env` ถูกเปิดดูจากภายนอกได้ ใช้ path นอก docroot เช่น `/var/www/riskhrms` หรือปิดการเข้าถึงด้วย `Require all denied` ทุก vhost ที่ยัง serve docroot นั้น

## 3. เตรียม environment

```bash
sudo -u riskhrms -H cp /opt/riskhrms/deploy/docker/.env.example /opt/riskhrms/deploy/docker/.env
sudo chmod 600 /opt/riskhrms/deploy/docker/.env
sudoedit /opt/riskhrms/deploy/docker/.env
```

แก้ทุกค่า `CHANGE_ME` และตรวจว่า:

- `MARIADB_ROOT_PASSWORD` / `MARIADB_PASSWORD` เป็นค่าสุ่มใหม่ และ `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_DATABASE` ตรงกับ `DATABASE_URL`
- `DATABASE_URL` ชี้ที่ `db:3306` (service ใน compose) เว้นแต่จะใช้ MariaDB ภายนอกตามหัวข้อ 3.1
- `JWT_SECRET` เป็นค่าสุ่มใหม่อย่างน้อย 32 ตัวอักษร
- `APP_BIND=127.0.0.1` คงไว้เพื่อให้ Nginx เป็นผู้เปิดหน้าบ้านเท่านั้น
- `AI_ASSISTANT_ENABLED=false` จนกว่าโรงพยาบาลอนุมัตินโยบายส่งข้อมูลไป AI ภายนอก
- ไฟล์นี้เป็นความลับ ห้าม commit แนบแชต หรือส่งออกนอกระบบ (`*.env` ถูก ignore ไว้แล้ว)

### 3.1 ใช้ MariaDB เดิมนอก Docker (ทางเลือก)

ถ้า DBA กำหนดให้ใช้ MariaDB ที่รันอยู่แล้วบน host หรือเซิร์ฟเวอร์ DB แยก:

1. คอมเมนต์ service `db` ทั้งบล็อกและบล็อก `volumes: db_data` ใน `docker-compose.yml` ให้เป็นการแก้ที่ตรวจสอบได้ (commit ผ่าน Git ไม่แก้ในเครื่อง production โดยตรง)
2. แก้ `DATABASE_URL` ใน `.env` เป็นเซิร์ฟเวอร์จริง เช่น `mysql://user:pass@172.17.0.1:3306/riskhospital` (`172.17.0.1` คือ host จากมุมมอง container เมื่อ bridge  default) หรือใช้ชื่อเซิร์ฟเวอร์ DB ภายใน
3. ต้องมีสิทธิพอสำหรับ migration เหมือนโหมด systemd และห้ามเปิดพอร์ต 3306 ออกอินเทอร์เน็ต

## 4. ติดตั้งระบบครั้งแรก

```bash
cd /opt/riskhrms
sudo -u riskhrms -H git status --short   # ต้องว่าง
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml build app
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml up -d
```

Container `app` จะรอ MariaDB พร้อม แล้วรัน `prisma migrate deploy` (เฉพาะ migration ที่ review แล้ว) จากนั้นเริ่มเสิร์ฟระบบที่ `127.0.0.1:3000`

> **สำคัญ — ฐานข้อมูลใหม่ต้องมี baseline schema ก่อน:** migration ใน repository เริ่มที่ `ALTER TABLE` บนโครงสร้างเดิมของโรงพยาบาล (เหมือนโหมด systemd ที่ DB ผลิตจริงมี schema มาก่อนแล้ว) ดังนั้นก่อนใช้งานจริง ให้ DBA restore baseline ที่อนุมัติแล้วเข้าฐานข้อมูลใหม่ (ดู 4.1) จากนั้น container จะ apply migration ที่เหลือให้เองทุกครั้งที่เริ่มทำงาน ถ้า log แสดง `P3009`/`P2021` แปลว่า baseline ยังไม่ถูก restore ห้ามใช้ `prisma db push` กับฐานข้อมูล production ทุกกรณี

ตรวจระบบ:

```bash
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml ps
curl -fsS -H 'Accept: application/json' http://127.0.0.1:3000/health
sudo journalctl -u docker   # หรือดู log ด้วย compose logs ตามหัวข้อ 8
```

`/health` ต้องตอบ `status=ok` และ `database=connected`

### 4.1 ย้ายข้อมูลเดิมเข้าโหมด Docker

- ฐานข้อมูล: ให้ DBA restore เฉพาะ dump ที่ผ่านการอนุมัติ วางไฟล์ไว้ที่ `deploy/docker/db/` (ถูก ignore ไว้ ห้าม commit) แล้วรัน:

```bash
sudo bash /opt/riskhrms/deploy/docker/restore-hrms-docker.sh deploy/docker/db/riskhrms-db-<stamp>.sql
```

สคริปต์จะหยุด app → ลบ/สร้างฐานข้อมูลใหม่ → import dump (strip DEFINER ของ trigger/view ให้) → รัน migration ที่ค้าง → ตรวจ `/health` ให้ การ restore ต้องได้รับอนุมัติจาก DBA เพราะทับข้อมูลที่มีอยู่ทั้งหมด

- ไฟล์แนบ (uploads): คัดลอกจากเครื่องเดิมเข้า volume `riskhrms_uploads_data` เช่น `sudo tar -C /var/lib/riskhrms -cf - uploads | sudo docker run --rm -i -v riskhrms_uploads_data:/target alpine sh -c 'cd /target && tar -xf -'` — ถ้าไม่คัดลอก ไฟล์แนบของรายการเก่าจะเปิดไม่ได้ใน stack นี้

- เวอร์ชัน MariaDB ใน compose ตั้งเป็น `mariadb:11.8` ให้ตรงกับเซิร์ฟเวอร์ production (11.8.x) หาก DBA ใช้เวอร์ชันอื่น ให้แก้ image ใน `docker-compose.yml` ให้ตรง major version ก่อน restore

## 5. ตั้ง Nginx และ HTTPS

เหมือนโหมด systemd ทุกประการ ใช้ `deploy/ubuntu/nginx-riskhrms.conf.example` proxy ไปที่ `127.0.0.1:3000` ติดตั้งใบรับรอง TLS ตามมาตรฐานโรงพยาบาล เปิด firewall เฉพาะ `80/443` — ไม่เปิด `3000` หรือ `3306` ออกนอก host

## 6. ขั้นตอนอัปเดต

ผู้พัฒนาทำงานบนเครื่อง development ตามปกติ: แก้บน feature branch → build/test → merge เข้า `main` → push ไป GitHub เมื่ออนุมัติ release แล้ว รันบน production:

```bash
sudo bash /opt/riskhrms/deploy/docker/update-hrms-docker.sh
```

Updater จะ: ตรวจ `.env` (ไม่พิมพ์ค่าลับ) → ตรวจ worktree สะอาดและอยู่ branch `main` → สำรองฐานข้อมูลพร้อม manifest/SHA-256 → `git pull --ff-only` → build image → `up -d` → ตรวจ `/health` → บันทึกสถานะที่ `/var/lib/riskhrms/deploy-state/last-successful-deploy.json`

หากล้มเหลวสคริปต์จะไม่ `git reset` และไม่ restore ฐานข้อมูลเอง ให้เก็บ `docker compose ps`, `docker compose logs`, commit ก่อนหน้า และ backup manifest ไว้ตรวจสอบ แล้วสร้าง release revert ที่ตรวจสอบได้

## 7. สำรองข้อมูล

```bash
sudo bash /opt/riskhrms/deploy/docker/backup-hrms-docker.sh
sudo bash /opt/riskhrms/deploy/docker/backup-hrms-docker.sh --include-uploads
```

ค่าเริ่มต้นเก็บที่ `/var/backups/riskhrms` เป็น `riskhrms-db-<stamp>.sql.gz` + manifest JSON พร้อม SHA-256 (โหมด 0700/0600) ควรวางบน volume เข้ารหัส สำรองต่อไปเครื่องอื่น และทดสอบ restore เป็นระยะ

## 8. ดู log และแก้ปัญหา

```bash
cd /opt/riskhrms
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml ps
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml logs --tail 200 app
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml logs --tail 200 db
sudo docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml exec app ./node_modules/.bin/prisma migrate status
```

- container `app` restart วนซ้ำ: ดู log บรรทัดแรก มักเป็น DB ไม่พร้อมหรือ `.env` ไม่ครบ
- ต้องการรัน container โดยไม่ apply migration (เช่น DBA จะรันเอง): ตั้ง `SKIP_MIGRATIONS="1"` ใน `.env` แล้ว `up -d` — ใช้เฉพาะเมื่อจำเป็นและมีผู้รับผิดชอบชัดเจน
- แก้ `.env` แล้วให้ค่าใหม่มีผล: `up -d` อีกครั้ง (compose จะ recreate เฉพาะ service ที่ค่าเปลี่ยน)

## 9. Checklist หลัง Deploy

- `docker compose ps` — ทั้ง `db` และ `app` เป็น `running (healthy)`
- `/health` ตอบ `status=ok`, `database=connected`
- Nginx HTTPS เปิด login ได้
- เปิดรายการ incident แบบ read-only ได้
- หน้าที่แก้ทำงานตามกรณีทดสอบ
- ไม่มี error ใหม่ใน `docker compose logs app`
- มี DB dump, manifest, SHA-256 และ commit ของ release

## 10. ข้อแตกต่างด้านเวลา

ทั้งสอง container ตั้ง `TZ` (ค่าเริ่มต้น `Asia/Bangkok`) ให้ตรงกับเวลาโรงพยาบาล ถ้าองค์กรใช้เขตเวลาอื่น ให้แก้ `TZ` ใน `.env`
