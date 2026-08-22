const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function stripCode(name) {
    return name.replace(/^([A-Z]+\/[\d\.]+[-\s]*)+/i, '').trim().toLowerCase();
}

// Very simple word overlap similarity
function similarity(s1, s2) {
    const w1 = s1.split(/\s+/).filter(x => x.length > 2);
    const w2 = s2.split(/\s+/).filter(x => x.length > 2);
    if(w1.length === 0 || w2.length === 0) return 0;
    
    let match = 0;
    for(const w of w1) {
        if(w2.some(x => x.includes(w) || w.includes(x))) match++;
    }
    return match / Math.max(w1.length, w2.length);
}

async function main() {
  const local = await prisma.riskstore.findMany({ select: { riskstore_id: true, riskstore_name: true, nrls_code: true } });
  const nrls = await prisma.nRLS_riskstore.findMany({ select: { nrls_code: true, name: true, category: true, sub_type: true, definition: true } });
  
  let mappedCount = 0;
  for (const lr of local) {
    if (lr.nrls_code) {
        // already mapped
        continue;
    }
    const cleanLocal = stripCode(lr.riskstore_name);
    
    let bestMatch = null;
    let bestScore = 0;

    for (const n of nrls) {
        const cleanNrls = n.name.toLowerCase().trim();
        // Exact substring
        if (cleanLocal.includes(cleanNrls) || cleanNrls.includes(cleanLocal)) {
            if (cleanNrls.length > 5) {
                bestMatch = n;
                bestScore = 1;
                break;
            }
        }

        // Token overlap
        const score = similarity(cleanLocal, cleanNrls);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = n;
        }

        // Try category / subtype overlap
        if (n.sub_type) {
            const st = n.sub_type.toLowerCase();
            if (cleanLocal.includes(st) || st.includes(cleanLocal)) {
                if (st.length > 5 && score + 0.3 > bestScore) {
                    bestMatch = n;
                    bestScore = score + 0.3;
                }
            }
        }
    }

    if (bestMatch && bestScore >= 0.5) {
        await prisma.riskstore.update({
            where: { riskstore_id: lr.riskstore_id },
            data: { nrls_code: bestMatch.nrls_code }
        });
        mappedCount++;
        console.log(`Mapped [${lr.riskstore_name}] -> [${bestMatch.nrls_code}] ${bestMatch.name} (Score: ${bestScore.toFixed(2)})`);
    }
  }

  console.log(`Successfully auto-mapped ${mappedCount} new local risks.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
