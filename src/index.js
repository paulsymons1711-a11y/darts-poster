// Darts Poster – reads Darts Atlas, makes event images + captions, posts to Facebook Pages,
// and learns which posting times get the most engagement.
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const express = require('express');
const { getEvents } = require('./dartsatlas');
const { renderImage } = require('./render');
const { makeCaption } = require('./captions');
const fb = require('./facebook');

const crypto = require('crypto');
const { CONFIG, saveConfig, ROOT } = require('./config');
const updater = require('./updater');
const STATE_FILE = path.join(ROOT, 'data', 'state.json');
const IMG_DIR = path.join(ROOT, 'data', 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

let state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  : { events: {}, posts: [], overrides: {}, slotStats: {} };
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
const log = (...a) => console.log(new Date().toLocaleString('en-GB'), '-', ...a);

const SLOT_HOURS = () => CONFIG.slotHours || [8, 12, 17, 19, 21];
const DAY_PRIORITY = [-1, 0, -4, -6, -2, -3, -5]; // which days before the event to use, in order
const venues = () => CONFIG.venues.filter(v => v.enabled !== false);
const venueByKey = k => CONFIG.venues.find(v => v.key === k);

// ---- UK time helpers ----
function londonParts(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(date).map(x => [x.type, +x.value || x.value]));
  return { y: p.year, m: p.month - 1, d: p.day, h: p.hour };
}
function londonToDate(y, m, d, h) {
  const guess = new Date(Date.UTC(y, m, d, h));
  const diff = (londonParts(guess).h - h + 24) % 24; // 0 in winter, 1 in summer
  return new Date(guess - diff * 3600e3);
}

// ---- best-time learner ----
function chooseHour(allowed) {
  const stats = h => state.slotStats[h] || { n: 0, total: 0 };
  const unexplored = allowed.filter(h => stats(h).n < 3);
  if (unexplored.length) return unexplored[Math.floor(Math.random() * unexplored.length)];
  if (Math.random() < 0.25) return allowed[Math.floor(Math.random() * allowed.length)];
  return allowed.reduce((best, h) => stats(h).total / stats(h).n > stats(best).total / stats(best).n ? h : best);
}

// ---- planning ----
async function planEvent(venue, ev) {
  const want = state.overrides[ev.id] ?? venue.postsPerEvent ?? 2;
  const mine = state.posts.filter(p => p.eventId === ev.id && p.status !== 'skipped');
  // Remove extra planned posts if the count was lowered
  const planned = mine.filter(p => p.status === 'planned').sort((a, b) => b.when.localeCompare(a.when));
  let have = mine.length;
  while (have > want && planned.length) { planned.shift().status = 'skipped'; have--; }

  const start = new Date(ev.start), sp = londonParts(start);
  const usedDays = new Set(mine.filter(p => p.status !== 'skipped').map(p => p.dayOffset));
  for (const off of DAY_PRIORITY) {
    if (have >= want) break;
    if (usedDays.has(off)) continue;
    const allowed = off === 0 ? SLOT_HOURS().filter(h => h <= sp.h - 2) : SLOT_HOURS();
    if (!allowed.length) continue;
    const hour = chooseHour(allowed);
    const when = londonToDate(sp.y, sp.m, sp.d + off, hour);
    if (when <= new Date()) continue;
    const id = `${ev.id}-${off}-${Date.now().toString(36)}`;
    const img = await renderImage(ev, venue.displayName, path.join(IMG_DIR, `${id}.png`));
    state.posts.push({
      id, venueKey: venue.key, eventId: ev.id, dayOffset: off, hour, when: when.toISOString(),
      status: 'planned', design: img.design, image: path.basename(img.file),
      caption: makeCaption(ev, venue.displayName, off === 0),
    });
    have++;
    log(`Planned ${venue.displayName} ${ev.eventName} for ${when.toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
  }
}

async function refresh() {
  for (const v of venues()) {
    try {
      const events = await getEvents(v.dartsAtlasUrl);
      log(`${v.displayName}: ${events.length} upcoming events`);
      const horizon = Date.now() + (CONFIG.planDaysAhead || 7) * 864e5;
      for (const ev of events) {
        state.events[ev.id] = { ...ev, venueKey: v.key };
        if (new Date(ev.start) <= horizon) await planEvent(v, ev);
      }
    } catch (e) { log(`Refresh failed for ${v.displayName}: ${e.message}`); }
  }
  save();
}

async function publish(p) {
  const v = venueByKey(p.venueKey);
  const file = path.join(IMG_DIR, p.image);
  if (CONFIG.dryRun || !v.facebookPageId || !v.facebookPageToken) {
    p.status = 'dry-run'; p.postedAt = new Date().toISOString();
    log(`[DRY RUN] Would post ${p.image} to ${v.displayName}`);
  } else {
    p.fbPostId = await fb.postPhoto(v.facebookPageId, v.facebookPageToken, file, p.caption);
    p.status = 'posted'; p.postedAt = new Date().toISOString();
    log(`Posted to ${v.displayName}: ${p.fbPostId}`);
  }
  save();
}

async function publishDue() {
  const now = new Date().toISOString();
  for (const p of state.posts.filter(p => p.status === 'planned' && p.when <= now)) {
    try { await publish(p); } catch (e) { p.status = 'error'; p.error = e.message; log(`Post failed: ${e.message}`); save(); }
  }
}

// Score posts 24–72h after posting and feed the time-slot learner
async function learn() {
  for (const p of state.posts.filter(p => p.status === 'posted' && !p.scored)) {
    const age = Date.now() - new Date(p.postedAt);
    if (age < 24 * 3600e3) continue;
    try {
      const v = venueByKey(p.venueKey);
      p.engagement = await fb.engagement(p.fbPostId, v.facebookPageToken);
      const s = state.slotStats[p.hour] ||= { n: 0, total: 0 };
      s.n++; s.total += p.engagement.score; p.scored = true;
      log(`Scored post at ${p.hour}:00 → ${p.engagement.score}`);
    } catch (e) { if (age > 72 * 3600e3) p.scored = true; }
  }
  save();
}

// ---- dashboard ----
const app = express();
app.use(express.json());
// ---- login (cookie, lasts 90 days) ----
const SESS_FILE = path.join(ROOT, 'data', 'sessions.json');
let sessions = fs.existsSync(SESS_FILE) ? JSON.parse(fs.readFileSync(SESS_FILE, 'utf8')) : {};
const cookie = req => (req.headers.cookie || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === 'dp')?.[1];
app.get('/login', (_, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  if (!CONFIG.dashboardPassword || req.body.password !== CONFIG.dashboardPassword) return res.redirect('/login?bad=1');
  const t = crypto.randomBytes(24).toString('hex');
  sessions[t] = Date.now() + 90 * 864e5; fs.writeFileSync(SESS_FILE, JSON.stringify(sessions));
  res.set('Set-Cookie', `dp=${t}; Path=/; Max-Age=${90 * 86400}; HttpOnly; SameSite=Lax`).redirect('/');
});
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use((req, res, next) => {
  if ((sessions[cookie(req)] || 0) > Date.now()) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not logged in' });
  res.redirect('/login');
});
app.use('/img', express.static(IMG_DIR));
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/api/state', (_, res) => res.json({
  venues: CONFIG.venues.map(v => ({ key: v.key, displayName: v.displayName, enabled: v.enabled !== false, postsPerEvent: v.postsPerEvent ?? 2, connected: !!v.facebookPageToken })),
  dryRun: !!CONFIG.dryRun, slotHours: SLOT_HOURS(), slotStats: state.slotStats,
  events: Object.values(state.events).filter(e => new Date(e.start) > Date.now()).sort((a, b) => a.start.localeCompare(b.start))
    .map(e => ({ ...e, posts: state.overrides[e.id] ?? venueByKey(e.venueKey)?.postsPerEvent ?? 2 })),
  posts: state.posts.filter(p => p.status !== 'skipped').sort((a, b) => a.when.localeCompare(b.when)).slice(-60),
}));
const findPost = id => state.posts.find(p => p.id === id);
app.post('/api/refresh', async (_, res) => { await refresh(); res.json({ ok: true }); });
app.post('/api/posts/:id/now', async (req, res) => {
  try { await publish(findPost(req.params.id)); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/posts/:id/skip', (req, res) => { findPost(req.params.id).status = 'skipped'; save(); res.json({ ok: true }); });
app.post('/api/posts/:id/redo', async (req, res) => {
  const p = findPost(req.params.id), ev = state.events[p.eventId], v = venueByKey(p.venueKey);
  const img = await renderImage(ev, v.displayName, path.join(IMG_DIR, p.image));
  p.design = img.design; p.caption = makeCaption(ev, v.displayName, p.dayOffset === 0); p.v = Date.now(); save();
  res.json({ ok: true });
});
app.post('/api/events/:id/count', async (req, res) => {
  const ev = state.events[req.params.id];
  state.overrides[ev.id] = Math.max(0, Math.min(5, +req.body.count));
  await planEvent(venueByKey(ev.venueKey), ev); save();
  res.json({ ok: true });
});

// ---- settings (editable from the phone) ----
const publicVenue = v => ({ ...v, facebookPageToken: undefined, hasToken: !!v.facebookPageToken });
app.get('/api/settings', (_, res) => res.json({
  dryRun: !!CONFIG.dryRun, planDaysAhead: CONFIG.planDaysAhead || 7, slotHours: SLOT_HOURS(),
  venues: CONFIG.venues.map(publicVenue),
  github: { ...CONFIG.github, token: undefined, hasToken: !!CONFIG.github.token },
}));
app.post('/api/settings', async (req, res) => {
  const b = req.body;
  if ('dryRun' in b) CONFIG.dryRun = !!b.dryRun;
  if (b.planDaysAhead) CONFIG.planDaysAhead = Math.max(1, Math.min(30, +b.planDaysAhead));
  if (Array.isArray(b.slotHours) && b.slotHours.length) CONFIG.slotHours = b.slotHours.map(Number).filter(h => h >= 0 && h < 24).sort((a, c) => a - c);
  if (b.newPassword && b.newPassword.length >= 6) CONFIG.dashboardPassword = b.newPassword;
  for (const nv of b.venues || []) {
    const v = venueByKey(nv.key); if (!v) continue;
    for (const k of ['displayName', 'dartsAtlasUrl', 'facebookPageId']) if (typeof nv[k] === 'string') v[k] = nv[k].trim();
    if ('postsPerEvent' in nv) v.postsPerEvent = Math.max(0, Math.min(5, +nv.postsPerEvent));
    if ('enabled' in nv) v.enabled = !!nv.enabled;
    if (nv.facebookPageToken) v.facebookPageToken = nv.facebookPageToken.trim();
  }
  if (b.github) {
    const g = CONFIG.github;
    if (typeof b.github.repo === 'string') g.repo = b.github.repo.replace('https://github.com/', '').replace(/\/$/, '').trim();
    if ('auto' in b.github) g.auto = !!b.github.auto;
    if (b.github.token) g.token = b.github.token.trim();
  }
  saveConfig(); res.json({ ok: true });
});
app.post('/api/update/check', async (_, res) => {
  try { res.json(await updater.checkAndInstall(log, true)); } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = CONFIG.port || 3060;
app.listen(PORT, () => log(`Dashboard on http://localhost:${PORT}  (dry run: ${!!CONFIG.dryRun})`));

cron.schedule('*/10 * * * *', publishDue);          // post anything due
cron.schedule('5 */6 * * *', refresh);              // re-read Darts Atlas 4× a day
cron.schedule('20 * * * *', learn);                 // check engagement hourly
cron.schedule('40 * * * *', () => {                // check GitHub for updates hourly
  if (CONFIG.github?.auto && CONFIG.github.token) updater.checkAndInstall(log).catch(e => log(`Update check failed: ${e.message}`));
});
refresh().then(publishDue);
