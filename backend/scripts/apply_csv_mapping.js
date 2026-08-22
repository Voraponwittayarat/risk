const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const csvParser = require('csv-parse/sync');

async function main() {
    console.log("Clearing existing mappings...");
    await prisma.riskstore.updateMany({ data: { nrls_code: null } });

    const fileContent = fs.readFileSync('scripts/mapping_data.csv', 'utf8');
    
    const records = csvParser.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        from_line: 3 // Skip the first two lines (the title), start from headers
    });
    
    const allLocalRisks = await prisma.riskstore.findMany({ select: { riskstore_id: true, riskstore_name: true } });
    let mappedCount = 0;

    for (const record of records) {
        const newCode = record['รหัสบัญชีใหม่ (New Code)'].trim();
        const oldNameStr = record['ชื่อบัญชีความเสี่ยงเก่าที่จับคู่ได้ (Old Name)'];
        
        if (!oldNameStr || oldNameStr === '[เป็นความเสี่ยงใหม่ ไม่พบในระบบเก่า]') continue;

        // Extract all codes inside [ ]
        const matches = [...oldNameStr.matchAll(/\[(.*?)\]/g)];
        const codes = matches.map(m => m[1].trim());

        for (const code of codes) {
            // Find all local risks that START WITH this code + space, or exact match
            const matchingLocalRisks = allLocalRisks.filter(lr => {
                const name = lr.riskstore_name.trim();
                return name.startsWith(code + ' ') || name.startsWith(code + '\t') || name === code;
            });

            for (const lr of matchingLocalRisks) {
                await prisma.riskstore.update({
                    where: { riskstore_id: lr.riskstore_id },
                    data: { nrls_code: newCode }
                });
                mappedCount++;
                console.log(`Mapped [${lr.riskstore_name}] -> ${newCode}`);
            }
        }
    }

    console.log(`Successfully mapped ${mappedCount} local risks based on the provided CSV.`);
}

main().catch(console.error).finally(() => process.exit(0));
