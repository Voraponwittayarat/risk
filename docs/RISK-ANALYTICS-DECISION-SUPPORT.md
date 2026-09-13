# Risk Analytics decision support

หน้า `/reports` เพิ่มส่วนตัดสินใจเหนือทะเบียนเดิม ใช้ API แบบอ่านอย่างเดียว
`GET /incidents/reports/decision-support?days=30&department_id=all`
รองรับ 30, 90 และ 180 วัน และใช้ JWT / record-level scope เดียวกับ Incident
โดยตัวกรองหน่วยงานต้อง intersect กับสิทธิ์เดิมเสมอ CAPA เชื่อมด้วย incident_id และ incident_id_risk ทั้งคู่

## สิ่งที่แสดง

- ความเสี่ยงสำคัญ: รหัส NRLS ยืนยันแล้ว เรียงจำนวนรุนแรงสูง G–I/4–5 ก่อน ตามด้วยจำนวนที่เพิ่มและจำนวนรายงาน ไม่มีคะแนนความเสี่ยงที่แต่งขึ้น
- เพิ่มขึ้น: เทียบช่วงก่อนหน้าที่มีจำนวนวันเท่ากัน หากฐานเป็นศูนย์จะไม่คำนวณเปอร์เซ็นต์
- เกิดซ้ำ: รหัสยืนยันเดียวกันในหน่วยงานเดียวอย่างน้อย 2 ครั้ง เป็นสัญญาณทบทวน ไม่ใช่การยืนยันสาเหตุซ้ำ
- หน่วยงานสนับสนุน: จำนวนรุนแรงสูง และภาระ RCA ค้าง รวมหน่วยงานที่มีแต่ RCA เก่า
- Near Miss: B แยกจากสภาพเสี่ยง A; ทะเบียนเชิงรุกนับแหล่ง FMEA, Safety Walkround, Proactive Risk Assessment เท่านั้น มีตัวเลือกเหล่านี้ในฟอร์มสร้าง/แก้ไขและตัวกรองทะเบียน
- RCA/CAPA: งานค้างทุกช่วงเวลา ไม่หายไปเมื่อเปลี่ยนช่วง Incident มีลิงก์กลับ Incident ต้นทาง งาน CAPA ที่ completed_at แล้วไม่นับเกินกำหนดลงมือทำ
- ประสิทธิผล: สถานะ EFFECTIVE / PARTIALLY_EFFECTIVE / INEFFECTIVE / ยังไม่มีผลประเมิน ของ CAPA ที่ไม่ยกเลิกทุกช่วงเวลา แยกงานเกินกำหนดประเมินผล
- เฝ้าระวังต่อ: ทะเบียนยังเปิดที่เป็น Never Event, ระดับสูง, เกินกำหนด หรือไม่มีวันทบทวน ใช้ระดับจาก review ล่าสุด ถ้าไม่มีใช้ระดับตั้งต้นพร้อมแจ้งผู้ใช้ และเปิดทะเบียนทบทวนต่อได้

## ขอบเขตและข้อจำกัด

ใช้ date_report ตามวันปฏิทินไทย รวมวันนี้ที่ยังไม่ครบวัน ข้อมูลเก่าที่ยังไม่ยืนยัน NRLS แสดงเป็นช่องว่างข้อมูล ไม่รวมในอันดับรหัส ข้อมูลทุกชุดอยู่ในขอบเขตผู้ใช้ ไม่เรียกข้อมูลรายละเอียดเหตุการณ์ ผู้ป่วย หรือ credentials

ไม่มีตัวหารจำนวนบริการ จึงเป็นจำนวนรายงาน ไม่ใช่อัตราความเสี่ยงหรือแนวโน้มเชิงสถิติ ยังไม่มี taxonomy กระบวนการสำหรับการจัดกลุ่ม การเป็นแหล่งอื่นในทะเบียนไม่แปลว่าไม่ใช่เชิงรุก ต้องให้ RM ตรวจแหล่งที่มา ทะเบียน scope=group ยังไม่คำนวณจำนวนเชื่อมโยงแทนทั้งกลุ่มและแจ้งให้ตรวจขอบเขต

ตัวกรองหน่วยงานใช้ร่วมกันทั้ง Decision Support, ทะเบียน, KPI และ Incident Matrix ปุ่มแผนกของฉันใช้ department_id จากบัญชีและล้างตัวกรองย่อยที่อาจซ่อนข้อมูล KPI ผูกกับ scope/due ของแท็บทะเบียน ช่วงวันใช้เฉพาะ Decision Support หลังบันทึกแก้ไข/ทบทวนจะโหลดทุกส่วนใหม่ ปุ่มพิมพ์/CSV เดิมส่งออกทะเบียน ไม่รวม Decision Support

แท็บมาตรฐานอ่านรายการจริงจาก nine_standards และเชื่อม risk_codes ผ่าน riskstore ไปยัง NRLS แล้วนับทะเบียนในขอบเขตผู้ใช้ แสดงจำนวนที่มี risk_prevention/risk_mitigation จริง ไม่มีสถานะ “มีมาตรการแล้ว” แบบตายตัว ถ้าไม่มีทะเบียนแสดง 0 และไม่อ้างว่าบรรลุมาตรฐาน แม่แบบในฟอร์มสร้างเป็นเพียงร่าง ไม่ใช่ข้อมูลรายงาน

การโหลดแต่ละ API ล้มเหลวไม่ทำให้ทะเบียนทั้งหน้าหาย มีข้อความระบุส่วนที่โหลดไม่ได้และปุ่มลองใหม่ ยกเลิกคำขอเก่าเมื่อเปลี่ยนตัวกรองเพื่อไม่ให้ผลลัพธ์เก่าเขียนทับใหม่ การเปิดรายละเอียดล้มเหลวไม่แสดง modal ด้วยข้อมูลไม่ครบ

API อ่าน metadata ของ Incident ที่มองเห็นทุกช่วงเวลาเพื่อเชื่อม CAPA เก่า แบ่งคำค้น CAPA ครั้งละ 500 identities ไม่มีการตัดยอดแบบเงียบ ควรตรวจเวลา response กับปริมาณข้อมูลจริงก่อนเปิดใช้งานใน production

## การตรวจสอบและส่งต่อ

ไฟล์ที่เปลี่ยนสำหรับงานนี้:

- frontend/src/pages/Reports.tsx
- frontend/src/components/RiskDecisionSupport.tsx (ใหม่)
- backend/src/modules/incidents/incidents.controller.ts (เพิ่ม route; เก็บการแก้ไขเดิมไว้)
- backend/src/modules/incidents/incidents.service.ts (เพิ่ม method และ import; เก็บการแก้ไขเดิมไว้)
- backend/src/modules/incidents/decision-support.ts (ใหม่)
- backend/src/modules/incidents/decision-support.spec.ts (ใหม่)
- docs/RISK-ANALYTICS-DECISION-SUPPORT.md (เอกสารนี้)
- backend/src/modules/risk-analysis/risk-analysis.controller.ts
- backend/src/modules/risk-analysis/risk-analysis.service.ts
- backend/src/modules/risk-analysis/risk-analysis.service.spec.ts (ใหม่)

- `npm run build` ทั้ง frontend/backend ผ่าน (frontend มีคำเตือน bundle เกิน 500 kB)
- Jest: decision-support.spec.ts, incidents.service.spec.ts, incidents.controller.spec.ts ผ่าน 61 tests
- Browser QA ใช้ข้อมูลจำลอง: หน้าจอ desktop/mobile, การค้นหารหัส, กรณีฐานเป็นศูนย์
- เพิ่ม regression tests ของทะเบียน/KPI/มาตรฐาน 7 ข้อ และ browser regression: กดแผนกของฉันยืนยัน 4 API ใช้หน่วยงานเดียวกัน, ตารางเปลี่ยนหน่วยงาน, Matrix ล้มแต่ทะเบียนยังแสดง, มาตรฐานไม่มีทะเบียนไม่แสดงสถานะสำเร็จ
- ไม่เปลี่ยน schema / ไม่มี migration / ไม่แก้ข้อมูลฐานข้อมูล / ไม่ deploy จึงไม่มี backup deployment หรือผล production health check
- Feature branch `codex/risk-analytics-decision-support` จาก base `c55d7673`; ไม่ทราบ running commit ของ production
- ก่อน deploy ให้ RM ตรวจนิยาม กลุ่มความรุนแรง แหล่งข้อมูลเชิงรุก และทดสอบด้วยบัญชีสิทธิ์จริงใน staging รวม GET /health, login, รายการ Incident แบบอ่านอย่างเดียว และหน้านี้ ตาม AGENTS.md
