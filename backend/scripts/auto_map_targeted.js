const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const exactMappings = [
    { keywords: ['แผลกดทับ'], nrls: 'CPP404' },
    { keywords: ['ตกเตียง', 'พลัดตกหกล้ม', 'หกล้ม', 'ตกจากเตียง'], nrls: 'CPP405' },
    { keywords: ['ระบุตัวผู้ป่วยผิด', 'ผิดคน', 'ผิดตัว'], nrls: 'CPP101' },
    { keywords: ['หลบหนี', 'หนีกลับ'], nrls: 'CPE202' },
    { keywords: ['ฆ่าตัวตาย', 'พยายามฆ่าตัวตาย'], nrls: 'CPE203' },
    { keywords: ['extubate', 'ท่อช่วยหายใจหลุด', 'เลื่อนหลุด'], nrls: 'CPP203' },
    { keywords: ['cpr', 'cardiopulmonary resuscitation', 'arrest'], nrls: 'CPE101' },
    { keywords: ['เข็มตำ', 'ของมีคมบาด', 'สัมผัสเลือด'], nrls: 'GPL401' },
    { keywords: ['prescribing error'], nrls: 'CPM201' },
    { keywords: ['transcribing error'], nrls: 'CPM202' },
    { keywords: ['dispensing error', 'จัดยาผิด', 'จ่ายยาผิด'], nrls: 'CPM203' },
    { keywords: ['administering error', 'บริหารยาผิด'], nrls: 'CPM204' },
    { keywords: ['phlebitis', 'อักเสบของหลอดเลือดดำ'], nrls: 'CPP401' }, // example
    { keywords: ['post partum hemorrhage', 'pph', 'ตกเลือดหลังคลอด'], nrls: 'CPM302' }, // need check
    { keywords: ['แพ้ยา', 'adverse drug reaction', 'adr'], nrls: 'CPM401' },
    { keywords: ['ข้อมูลในเวชระเบียนไม่ครบถ้วน', 'บันทึกไม่ครบ'], nrls: 'GPL203' }
];

async function main() {
  const local = await prisma.riskstore.findMany({ select: { riskstore_id: true, riskstore_name: true } });
  
  let mappedCount = 0;
  for (const lr of local) {
    const name = lr.riskstore_name.toLowerCase();
    
    let matchCode = null;
    for (const rule of exactMappings) {
        if (rule.keywords.some(kw => name.includes(kw.toLowerCase()))) {
            matchCode = rule.nrls;
            break;
        }
    }

    if (matchCode) {
        await prisma.riskstore.update({
            where: { riskstore_id: lr.riskstore_id },
            data: { nrls_code: matchCode }
        });
        mappedCount++;
        console.log(`Mapped [${lr.riskstore_name}] -> ${matchCode}`);
    }
  }

  console.log(`Successfully mapped ${mappedCount} out of ${local.length} local risks.`);
}

main().catch(console.error).finally(() => process.exit(0));
