const fs = require('fs');

const envFile = process.argv[2];
if (!envFile || !fs.existsSync(envFile)) {
  console.error('Production environment file is missing.');
  process.exit(1);
}

const source = fs.readFileSync(envFile, 'utf8');
const values = {};
for (const rawLine of source.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const separator = line.indexOf('=');
  if (separator < 1) continue;
  const key = line.slice(0, separator).trim();
  let value = line.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  values[key] = value;
}

const failures = [];
if (source.includes('CHANGE_ME')) failures.push('environment file still contains CHANGE_ME placeholders');
if (!values.DATABASE_URL || !values.DATABASE_URL.startsWith('mysql://')) failures.push('DATABASE_URL must be a mysql:// URL');
if (values.BACKUP_DATABASE_URL && !values.BACKUP_DATABASE_URL.startsWith('mysql://')) failures.push('BACKUP_DATABASE_URL must be empty or a mysql:// URL');
if (!values.JWT_SECRET || values.JWT_SECRET.length < 32) failures.push('JWT_SECRET must contain at least 32 characters');
if (values.NODE_ENV && values.NODE_ENV !== 'production') failures.push('NODE_ENV must be production');
if (values.HOST && !['127.0.0.1', 'localhost'].includes(values.HOST)) failures.push('HOST should be 127.0.0.1 when Nginx is used');
if (!values.UPLOAD_DIR || !values.UPLOAD_DIR.startsWith('/')) failures.push('UPLOAD_DIR must be an absolute Linux path');

if (failures.length) {
  for (const failure of failures) console.error(`[INVALID] ${failure}`);
  process.exit(1);
}
console.log('[OK] Production environment structure is valid. Secret values were not printed.');
