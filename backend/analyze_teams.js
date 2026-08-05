const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Analyzing Risk Register sendto_team_id mapping ===");

  const teamDistribution = {};

  const registrations = await prisma.riskregister.findMany({
    where: { sendto_team_id: { not: null } },
    select: {
      sendto_team_id: true,
      riskstore_id: true
    }
  });

  console.log(`Found ${registrations.length} registrations with a team ID.`);

  // Load all riskstore items to map names
  const riskstore = await prisma.riskstore.findMany({
    select: { riskstore_id: true, riskstore_name: true }
  });
  const riskMap = new Map(riskstore.map(r => [r.riskstore_id, r.riskstore_name]));

  registrations.forEach(reg => {
    const teamId = reg.sendto_team_id;
    if (!teamDistribution[teamId]) {
      teamDistribution[teamId] = {
        total: 0,
        sampleNames: new Set()
      };
    }
    teamDistribution[teamId].total += 1;
    const name = riskMap.get(reg.riskstore_id) || 'Unknown';
    // Extract prefix e.g. "PT/", "IC/", "ENV/"
    const prefix = name.split('/')[0] || 'Unknown';
    teamDistribution[teamId].sampleNames.add(prefix);
  });

  for (const [teamId, data] of Object.entries(teamDistribution)) {
    console.log(`Team ID: ${teamId}`);
    console.log(`  - Total cases: ${data.total}`);
    console.log(`  - Associated Topic Prefixes:`, Array.from(data.sampleNames));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
