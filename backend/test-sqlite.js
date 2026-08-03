try {
  const db = require('better-sqlite3')('test.db');
  console.log('SQLite loaded successfully');
} catch (e) {
  console.error('SQLite failed to load:', e);
}
