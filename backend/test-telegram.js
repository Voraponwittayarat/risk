require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const botApiToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!chatId) {
    console.error('No chat id');
    return;
  }

  const pendingRisks = await prisma.riskregister.findMany({
    where: { status_risk: { in: ['รายงาน', 'ทบทวน'] } },
    select: { department_id: true, sendto_department_id: true, status_risk: true },
  });

  console.log('Pending risks count:', pendingRisks.length);

  const deptCounts = new Map();
  let totalPending = 0;
  let totalReviewing = 0;

  for (const risk of pendingRisks) {
    if (risk.status_risk === 'รายงาน') totalPending++;
    else if (risk.status_risk === 'ทบทวน') totalReviewing++;

    const deptId = risk.department_id ? risk.department_id.toString() : 'UNKNOWN';
    if (!deptCounts.has(deptId)) deptCounts.set(deptId, { pending: 0, reviewing: 0 });
    if (risk.status_risk === 'รายงาน') deptCounts.get(deptId).pending++;
    else if (risk.status_risk === 'ทบทวน') deptCounts.get(deptId).reviewing++;

    if (risk.sendto_department_id) {
      const targetDeptId = risk.sendto_department_id.toString();
      if (targetDeptId !== deptId) {
        if (!deptCounts.has(targetDeptId)) deptCounts.set(targetDeptId, { pending: 0, reviewing: 0 });
        if (risk.status_risk === 'รายงาน') deptCounts.get(targetDeptId).pending++;
        else if (risk.status_risk === 'ทบทวน') deptCounts.get(targetDeptId).reviewing++;
      }
    }
  }

  const deptIds = Array.from(deptCounts.keys()).filter(id => id !== 'UNKNOWN').map(Number);
  const departments = await prisma.department.findMany({ where: { id: { in: deptIds } } });
  const deptMap = new Map(departments.map(d => [d.id.toString(), d.depart_name]));

  let message = `🔔 <b>แจ้งเตือนสรุปสถานการณ์ความเสี่ยง</b> 🔔\n\n`;
  message += `ตอนนี้มีความเสี่ยงที่รอการยืนยันและรอทบทวนในระบบอยู่ <b>${totalPending + totalReviewing}</b> เรื่อง\n`;
  message += `ขอความร่วมมือแกนนำและหัวหน้างานทุกหน่วยเข้าไปตรวจสอบและทบทวนด้วยนะคะ หากเรื่องไหนแก้ไขแล้ว ก็สามารถจำหน่ายได้เลยค่ะ\n\n`;
  message += `📊 <b>สรุปยอดรวม:</b>\n`;
  message += `- รอยืนยัน <b>${totalPending}</b> เรื่อง\n`;
  message += `- รอทบทวน <b>${totalReviewing}</b> เรื่อง\n\n`;
  message += `🏥 <b>แยกตามหน่วยงานที่ค้าง:</b>\n`;

  for (const [deptId, counts] of deptCounts.entries()) {
    const deptName = deptMap.get(deptId) || 'ไม่ระบุหน่วยงาน';
    message += `\n🔸 <b>${deptName}</b>\n`;
    if (counts.pending > 0) message += `   • รอยืนยัน: ${counts.pending} เรื่อง\n`;
    if (counts.reviewing > 0) message += `   • รอทบทวน: ${counts.reviewing} เรื่อง\n`;
  }
  
  message += `\n<i>ตรวจสอบได้ที่ระบบ HRMS</i>`;

  console.log('Message length:', message.length);
  
  const url = `https://api.telegram.org/bot${botApiToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });

  if (!response.ok) {
    console.error('Failed:', await response.text());
  } else {
    console.log('Success');
  }
}

test().catch(console.error);
