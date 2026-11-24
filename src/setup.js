// Run by INSTALL.bat: makes sure settings exist and a dashboard password is set.
const readline = require('readline');
const { CONFIG, saveConfig } = require('./config');

if (CONFIG.dashboardPassword) { console.log('Dashboard password already set.'); process.exit(0); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = () => rl.question('\nChoose a password for the dashboard (at least 6 characters): ', p => {
  if ((p || '').trim().length < 6) { console.log('Too short, try again.'); return ask(); }
  CONFIG.dashboardPassword = p.trim(); saveConfig(); rl.close();
  console.log('Saved. You can change it later on the dashboard Settings page.');
});
ask();
