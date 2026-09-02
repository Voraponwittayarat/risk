const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(process.argv[2] || '');
const backupDirectory = path.resolve(process.argv[3] || '/var/backups/riskhrms');
const includeUploads = process.argv.includes('--include-uploads');
const envFile = path.join(projectRoot, 'backend', '.env');

function sha256File(filePath) {
  const result = spawnSync('sha256sum', [filePath], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`Unable to calculate SHA-256 for ${filePath}`);
  return result.stdout.trim().split(/\s+/)[0];
}

if (!fs.existsSync(envFile)) throw new Error(`Missing environment file: ${envFile}`);
const dotenv = require(path.join(projectRoot, 'backend', 'node_modules', 'dotenv'));
const config = dotenv.parse(fs.readFileSync(envFile));
const configuredBackupUrl = config.BACKUP_DATABASE_URL || config.DATABASE_URL;
if (!configuredBackupUrl) throw new Error('DATABASE_URL is missing from backend/.env');

let databaseUrl;
try {
  databaseUrl = new URL(configuredBackupUrl);
} catch {
  throw new Error('DATABASE_URL is invalid. Its value was not printed.');
}
if (databaseUrl.protocol !== 'mysql:') throw new Error('DATABASE_URL must use mysql://');

let dumpCommand = '';
for (const candidate of ['mariadb-dump', 'mysqldump']) {
  const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
  if (!probe.error && probe.status === 0) {
    dumpCommand = candidate;
    break;
  }
}
if (!dumpCommand) throw new Error('mariadb-dump or mysqldump was not found in PATH');

fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
fs.chmodSync(backupDirectory, 0o700);
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const dumpPath = path.join(backupDirectory, `riskhrms-db-${stamp}.sql`);
const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
const databaseUser = decodeURIComponent(databaseUrl.username);
const databasePassword = decodeURIComponent(databaseUrl.password);
const databasePort = databaseUrl.port || '3306';
if (!databaseName || !databaseUser) throw new Error('DATABASE_URL must contain the database name and user');

const dump = spawnSync(dumpCommand, [
  '--single-transaction',
  '--routines',
  '--events',
  '--triggers',
  '--hex-blob',
  '--default-character-set=utf8mb4',
  `--host=${databaseUrl.hostname}`,
  `--port=${databasePort}`,
  `--user=${databaseUser}`,
  `--result-file=${dumpPath}`,
  databaseName,
], {
  env: { ...process.env, MYSQL_PWD: databasePassword },
  stdio: ['ignore', 'inherit', 'inherit'],
});
if (dump.error || dump.status !== 0) throw new Error(`Database dump failed with exit code ${dump.status ?? 'unknown'}`);

const dumpStat = fs.statSync(dumpPath);
if (dumpStat.size < 100) throw new Error(`Database dump is unexpectedly small: ${dumpPath}`);
fs.chmodSync(dumpPath, 0o600);
const sha256 = sha256File(dumpPath);
const gitResult = spawnSync('git', ['-C', projectRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
const manifest = {
  created_at: new Date().toISOString(),
  git_commit: gitResult.status === 0 ? gitResult.stdout.trim() : 'unknown',
  database_host: databaseUrl.hostname,
  database_name: databaseName,
  dump_file: dumpPath,
  dump_bytes: dumpStat.size,
  sha256,
};

if (includeUploads && config.UPLOAD_DIR) {
  const uploadDirectory = path.isAbsolute(config.UPLOAD_DIR)
    ? config.UPLOAD_DIR
    : path.resolve(projectRoot, 'backend', config.UPLOAD_DIR);
  if (fs.existsSync(uploadDirectory)) {
    const uploadArchive = path.join(backupDirectory, `riskhrms-uploads-${stamp}.tar.gz`);
    const archive = spawnSync('tar', ['-czf', uploadArchive, '-C', path.dirname(uploadDirectory), path.basename(uploadDirectory)], { stdio: 'inherit' });
    if (archive.error || archive.status !== 0) throw new Error('Upload archive failed');
    fs.chmodSync(uploadArchive, 0o600);
    manifest.upload_archive = uploadArchive;
    manifest.upload_sha256 = sha256File(uploadArchive);
  } else {
    console.error('[WARN] UPLOAD_DIR does not exist; the database backup is still valid.');
  }
}

const manifestPath = `${dumpPath}.json`;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
console.error(`[OK] Database backup: ${dumpPath}`);
console.error(`[OK] SHA-256: ${sha256}`);
console.log(dumpPath);
