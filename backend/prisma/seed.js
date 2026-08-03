const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');

async function main() {
  const sqlite = new Database('./dev.db');
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding SQLite database...');

  await prisma.incident.createMany({
    data: [
      {
        title: 'Network Outage in Building A',
        description: 'Main switch in Building A went down causing complete network loss.',
        severity: 'critical',
        status: 'in_progress',
        reporter: 'John Doe',
        location: 'Building A, 2nd Floor',
      },
      {
        title: 'Water Leak in Restroom',
        description: 'Pipe burst in the men\'s restroom on the 3rd floor.',
        severity: 'high',
        status: 'open',
        reporter: 'Jane Smith',
        location: 'Building B, 3rd Floor',
      },
      {
        title: 'Flickering Lights in Conference Room',
        description: 'The lights in Conference Room C are flickering constantly.',
        severity: 'low',
        status: 'resolved',
        reporter: 'Alice Johnson',
        location: 'Building A, 1st Floor',
      }
    ]
  });

  console.log('Seeding finished.');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
