// Settings live in data/config.json, which updates never touch.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const FILE = path.join(DATA, 'config.json');
fs.mkdirSync(DATA, { recursive: true });

if (!fs.existsSync(FILE)) {
  // First run: start from the example (or an old config.json from an earlier version)
  const old = path.join(ROOT, 'config.json');
  fs.copyFileSync(fs.existsSync(old) ? old : path.join(ROOT, 'config.example.json'), FILE);
}

const CONFIG = JSON.parse(fs.readFileSync(FILE, 'utf8'));
CONFIG.github ||= { repo: 'paulsymons1711-a11y/darts-poster', branch: 'main', token: '', auto: true, installedSha: '' };

function saveConfig() { fs.writeFileSync(FILE, JSON.stringify(CONFIG, null, 2)); }

module.exports = { CONFIG, saveConfig, ROOT, DATA };
