const keepAlive = setInterval(() => {}, 1000);
require('./legacy-nrls-backfill-lib').run('verify').catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => clearInterval(keepAlive));
