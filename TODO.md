# TODO / Next Steps

- [x] รวมผลดำเนินการในหน้าทบทวน: หน่วยงานใช้ Mini; ส่งศูนย์ใช้ Standard; ส่งตรงไม่บังคับปัจจัยร่วมและมาตรการ; Concise เริ่มจากเลือกหลายเหตุการณ์ในหน้ารายการ
- [ ] ตรวจหน้าทบทวนบน staging ด้วยบัญชีหัวหน้า/RM/ทีมนำ รวมกรณีส่งตรง, RCA เดิม, งาน CAPA ค้าง และจำหน่ายไม่สำเร็จหลังบันทึกทบทวน
- [ ] หลังอนุมัติ release ตรวจ backup และ SHA-256 ก่อน merge/push main; ตรวจ health/login/รายการและ flow ทบทวนหลัง poller deploy
- [ ] ตรวจการแก้ไขเอกสาร Mini/Concise เดิมและการ sync CAPA ก่อนเพิ่มช่องทางแก้เอกสารเดิม (รอบนี้เปิดรายการเดิมเพื่อดู ไม่เขียนทับ CAPA)

- [ ] ตรวจหน้าต่างยืนยันด้วยข้อมูลทดสอบ Clinical และ General รวมกรณีเปลี่ยนประเภท NRLS และระดับเดิมไม่ตรงประเภท หลัง deploy

- [ ] Review และ merge branch นี้กับ `main` หลังผู้ดูแลตรวจผล RCA/performance
- [ ] ก่อน deploy ให้รัน `deploy/ubuntu/backup-hrms.sh` และตรวจ SHA-256 ของ backup
- [ ] ใช้ `prisma migrate deploy` สำหรับ migration RCA ในฐานข้อมูลทดสอบก่อน production
- [ ] หลัง deploy ตรวจ `/health`, login, รายการ `/incidents/pending` และ RCA แบบอ่านอย่างเดียวจากเครื่องอื่น
- [ ] ย้ายการกรองสิทธิ์ของ CAPA จากการอ่านแล้ว filter ใน Node.js ไปเป็นเงื่อนไข Prisma พร้อม pagination
- [ ] ปรับรายงาน matrix และ decision support ให้ใช้ aggregate/pagination ฝั่งฐานข้อมูลเมื่อจำนวน incident เพิ่ม
- [ ] ตรวจ load test การเปิดหลายเครื่องพร้อมกัน โดยไม่ใช้ข้อมูลผู้ป่วยจริง
- [x] Mini RCA เปิดเป็นเครื่องมือในหน้าทบทวนโดยตรง; ซ่อนสาเหตุและมาตรการของแบบปกติเมื่อใช้งาน และกลับแบบปกติได้ (2 ต.ค. 2569)
- [x] รวมแนวโน้ม/งานติดตามเป็นหน้าแรกของ /reports และย่อส่วนหัว/สถิติ; สลับ workflow 4 ทะเบียน → 5 ติดตามมาตรการ (2 ต.ค. 2569)
- [ ] ตรวจหน้า /reports ใหม่กับข้อมูลจริงแบบอ่านอย่างเดียวก่อน release รอบถัดไป

- [x] ศูนย์ RCA รพ.: เพิ่มสิทธิ์ RM/PCT รายการแยก นัดผู้ร่วม และส่ง Telegram ส่วนกลาง
- [ ] ตรวจชื่อทีมจริงว่ามีคำ RM/PCT, review migration ตารางนัด, deploy ผ่าน backup/poller และ smoke test ก่อนใช้งานนัดจริง (ไม่ส่งข้อความทดสอบเข้ากลุ่มจริงโดยไม่จำเป็น)

- [x] ปรับ Timeline RCA เป็นตารางกระชับ รับ Excel 2–4 คอลัมน์ พร้อมภาพสรุปสีจากข้อมูลที่กรอก

- [x] เอา 5 Whys ออกจากแบบฟอร์ม RCA และตัวเลือกผู้ช่วย AI โดยรักษาข้อมูลประวัติเดิม

- [x] รายงาน RCA แบบฟอร์ม เลือกเฉพาะส่วนที่กรอก ส่งออก .doc และพิมพ์บันทึก PDF
- [ ] หลัง release ตรวจรายงานยาวและการแบ่งหน้าใน Word/Chrome จริงกับผู้ใช้งาน; regression การเลือกข้อมูลและ escaping ผ่านแล้ว

- [x] หัวรายงาน RCA แบบ HA พร้อมโลโก้ TH Sarabun 14pt และรวมวันที่ Timeline ซ้ำในกลุ่มต่อเนื่อง

- [x] เน้นหัวแบบบันทึกการวิเคราะห์ RCA และเพิ่มแผนภูมิ Timeline ในรายงานส่งออก

- [x] ย้ายปุ่มจำหน่าย RCA ลงแถบล่าง และปรับแถบเป็นสีอ่อน

- [x] รวม RCA กับ Medication import main ล่าสุด ทดสอบ build ทั้งสองแอปและ backend 231 tests พร้อมตรวจ backup/SHA-256 ก่อน release 4 ต.ค. 2569
- [ ] หลัง poller รับ RCA release ตรวจ migration, running commit, health, login และ incident/RCA list แบบอ่านอย่างเดียว; ยืนยันสิทธิ์ RM/PCT กับทีมจริงและการนัดหมายครั้งแรกโดยผู้ใช้งาน

## 4 ตุลาคม 2569 — Timeline / RCA assistant

- [x] Timeline จากต้นฉบับใน browser, preview/edit, หลักฐาน, missing/conflicting dates/times, append/explicit replace/guarded undo
- [x] ลบ fabricated AI fallback; จำกัดชนิด/ขนาด input, request concurrency, client/provider timeout, stale response และ sensitive error logging
- [x] Mini import เคารพ selected sections, เพิ่มข้อมูลเดิม, normalize Swiss Cheese keys, ยืนยันก่อนนำเข้า
- [x] frontend/backend build; backend 244 tests; Timeline/Excel 10 tests; synthetic browser append/replace/undo
- [ ] Review และ deploy ตาม poller flow เมื่อผู้ใช้สั่ง release; backup + SHA-256 ก่อน production update และตรวจ health/auth/read-only list/Timeline
- [ ] ทดสอบ Mini ด้วย provider mock: เลือกเฉพาะ CMP/Swiss/NRLS, ยกเลิกทั้งหมด, ปิดขณะ pending และ reopen; ไม่ใช้ข้อมูลจริงกับ external AI
- [x] AI endpoint ตรวจ incident_id, สิทธิ์ผู้ทบทวน, ขอบเขตหน่วยงานและสถานะ ก่อนประมวลผล (มี regression tests)
- [ ] ประเมิน quota ต่อผู้ใช้เพิ่มเติม หากจำนวนผู้ใช้ AI พร้อมกันเพิ่มขึ้น
- [ ] รองรับเดือนภาษาไทย/ปีสองหลักและสัมภาษณ์หลายเหตุการณ์ในบรรทัดเดียว จากตัวอย่าง synthetic โดยไม่เดาข้อมูล
- [ ] ประเมินความจำเป็นของ provenance ถาวรสำหรับ Timeline; รอบนี้เก็บหลักฐานเฉพาะ preview ไม่มี migration
