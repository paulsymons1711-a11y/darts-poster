// Updates from a private GitHub repo (same idea as the Telegram bot).
// Downloads the newest commit, backs up the current files, swaps them in, and restarts.
// Never touches data/ (settings, queue, images) or node_modules/.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');
const { CONFIG, saveConfig, ROOT } = require('./config');

const KEEP = new Set(['data', 'node_modules', 'backup', '.git']);
const headers = () => ({
  Accept: 'application/vnd.github+json', 'User-Agent': 'darts-poster-updater', 'X-GitHub-Api-Version': '2022-11-28',
  ...(CONFIG.github.token ? { Authorization: `Bearer ${CONFIG.github.token}` } : {}),
});

async function latest() {
  const g = CONFIG.github;
  if (!g.repo) throw new Error('No GitHub repo set');
  const r = await fetch(`https://api.github.com/repos/${g.repo}/commits/${g.branch || 'main'}`, { headers: headers() });
  if (r.status === 401 || r.status === 403) throw new Error('GitHub rejected the token');
  if (r.status === 404) throw new Error('Repo not found – make the darts-poster repo public on GitHub (or add a token)');
  if (!r.ok) throw new Error(`GitHub error ${r.status}`);
  const d = await r.json();
  return { sha: d.sha, message: (d.commit?.message || '').split('\n')[0], date: d.commit?.committer?.date };
}

function copyDir(from, to) {
  for (const name of fs.readdirSync(from)) {
    if (KEEP.has(name)) continue;
    const a = path.join(from, name), b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); copyDir(a, b); }
    else fs.copyFileSync(a, b);
  }
}

async function install(sha, log = console.log) {
  const r = await fetch(`https://api.github.com/repos/${CONFIG.github.repo}/zipball/${sha}`, { headers: headers() });
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  const zip = new AdmZip(Buffer.from(await r.arrayBuffer()));
  const tmp = path.join(ROOT, 'data', 'update-tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  zip.extractAllTo(tmp, true);
  const top = path.join(tmp, fs.readdirSync(tmp)[0]); // GitHub zips have one top folder
  if (!fs.existsSync(path.join(top, 'src', 'index.js'))) throw new Error('Download does not look like Darts Poster');

  // Quick syntax check before swapping anything in
  for (const f of fs.readdirSync(path.join(top, 'src')).filter(f => f.endsWith('.js')))
    execSync(`node --check "${path.join(top, 'src', f)}"`);
  const html = fs.readFileSync(path.join(top, 'src', 'dashboard.html'), 'utf8');
  try { new Function('return async () => {' + (html.match(/<script>([\s\S]*)<\/script>/) || [])[1] + '}'); }
  catch (e) { throw new Error('New dashboard has an error, not installing: ' + e.message); }

  const backup = path.join(ROOT, 'backup');
  fs.rmSync(backup, { recursive: true, force: true }); fs.mkdirSync(backup);
  copyDir(ROOT, backup);

  const oldPkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  copyDir(top, ROOT);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8') !== oldPkg) {
    log('Packages changed – running npm install');
    execSync('npm install --omit=dev', { cwd: ROOT, stdio: 'inherit' });
  }
  CONFIG.github.installedSha = sha; saveConfig();
  log('Update installed – restarting');
  setTimeout(() => process.exit(0), 1500); // run.bat starts it again
}

const vnum = v => String(v || '0').split('.').reduce((a, n) => a * 1000 + (+n || 0), 0);
async function remoteVersion(sha) {
  const r = await fetch(`https://api.github.com/repos/${CONFIG.github.repo}/contents/package.json?ref=${sha}`,
    { headers: { ...headers(), Accept: 'application/vnd.github.raw+json' } });
  if (!r.ok) throw new Error(`Could not read version (${r.status})`);
  return JSON.parse(await r.text()).version;
}
async function checkAndInstall(log = console.log, force = false) {
  const l = await latest();
  const mine = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const theirs = await remoteVersion(l.sha);
  l.version = theirs;
  if (vnum(theirs) <= vnum(mine))
    return { upToDate: true, ...l };
  log(`New version on GitHub: ${l.message}`);
  await install(l.sha, log);
  return { installing: true, ...l };
}

module.exports = { latest, checkAndInstall };
