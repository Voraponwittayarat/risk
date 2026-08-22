const fs = require('fs');
let c = fs.readFileSync('src/modules/incidents/incidents.service.ts', 'utf8');
const search = `if (['E', 'F', 'G', 'H', 'I', '3', '4', '5'].includes(createData.level_id)) {
        this.sendTelegramAlert(newIncident).catch(e => console.error('Telegram send error:', e));
      }`;
c = c.replace(search, "this.sendTelegramAlert(newIncident).catch(e => console.error('Telegram send error:', e));");
fs.writeFileSync('src/modules/incidents/incidents.service.ts', c);
