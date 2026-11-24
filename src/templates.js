// Six plain (unbranded) 1080x1080 post designs. Each takes an event and returns HTML.
// ev: { eventName, venue, town, dayName, dateLong, dateShort:{day,month}, time, fee, format, cta }

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FONTS = `
  --heavy: "Arial Black", "Bahnschrift", "Impact", "Inter", sans-serif;
  --body: "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
  --cond: "Impact", "Bahnschrift Condensed", "Arial Narrow", "Inter", sans-serif;`;

// CSS-only dartboard graphic
const board = (size, extra = '') => `
<div data-deco style="width:${size}px;height:${size}px;border-radius:50%;position:relative;${extra}
  background:#111;box-shadow:0 20px 60px rgba(0,0,0,.45)">
  <div style="position:absolute;inset:6%;border-radius:50%;
    background:repeating-conic-gradient(from -9deg,#d7261e 0 18deg,#178a3a 18deg 36deg)"></div>
  <div style="position:absolute;inset:9%;border-radius:50%;
    background:repeating-conic-gradient(from -9deg,#111 0 18deg,#efe6cf 18deg 36deg)"></div>
  <div style="position:absolute;inset:30%;border-radius:50%;
    background:repeating-conic-gradient(from -9deg,#d7261e 0 18deg,#178a3a 18deg 36deg)"></div>
  <div style="position:absolute;inset:33%;border-radius:50%;
    background:repeating-conic-gradient(from -9deg,#111 0 18deg,#efe6cf 18deg 36deg)"></div>
  <div style="position:absolute;inset:45%;border-radius:50%;background:#178a3a"></div>
  <div style="position:absolute;inset:47.5%;border-radius:50%;background:#d7261e"></div>
</div>`;

const shell = (css, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
:root{${FONTS}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1080px;overflow:hidden}
body{font-family:var(--body);-webkit-font-smoothing:antialiased}
${css}</style></head><body>${body}</body></html>`;

const details = ev => [ev.fee && `Entry ${esc(ev.fee)}`, ev.format && esc(ev.format)].filter(Boolean);

const designs = [
  // 1 — Charcoal + red, board bottom-right
  ev => shell(`
    body{background:#1b1d21;color:#fff;position:relative}
    .k{color:#e8392f;font:800 34px var(--body);letter-spacing:6px;text-transform:uppercase}
    h1{font:900 118px/0.95 var(--heavy);text-transform:uppercase;margin:24px 0 30px;max-width:900px}
    .d{font:700 52px var(--body)} .t{font:400 40px var(--body);color:#c9ccd2;margin-top:8px}
    .v{font:600 36px var(--body);margin-top:40px;color:#fff}
    .pill{display:inline-block;margin-top:46px;background:#e8392f;padding:22px 40px;border-radius:60px;font:800 38px var(--body)}
    .x{font:500 30px var(--body);color:#9aa0a8;margin-top:18px}
  `, `<div style="padding:90px">
      <div class="k">Darts night · ${esc(ev.dayName)}</div>
      <h1>${esc(ev.eventName)}</h1>
      <div class="d">${esc(ev.dateLong)}</div><div class="t">${esc(ev.time)}</div>
      <div class="v">📍 ${esc(ev.venue)}</div>
      <div class="x">${details(ev).join(' · ')}</div>
      <div class="pill">${esc(ev.cta)}</div></div>
    ${board(560, 'position:absolute;right:-150px;bottom:-150px')}`),

  // 2 — Yellow & black hazard stripes
  ev => shell(`
    body{background:#ffd21f;color:#111}
    .stripe{height:120px;background:repeating-linear-gradient(-45deg,#111 0 40px,#ffd21f 40px 80px)}
    .in{padding:70px 90px}
    .k{font:900 40px var(--heavy);text-transform:uppercase}
    h1{font:900 140px/0.92 var(--cond);text-transform:uppercase;margin:20px 0 40px}
    .box{background:#111;color:#ffd21f;padding:36px 44px;border-radius:14px}
    .box b{display:block;font:900 60px var(--heavy)} .box span{font:600 38px var(--body);color:#fff}
    .v{font:800 40px var(--body);margin-top:36px} .x{font:600 32px var(--body);margin-top:10px}
  `, `<div class="stripe" data-deco></div><div class="in">
      <div class="k">Get your name down 🎯</div>
      <h1>${esc(ev.eventName)}</h1>
      <div class="box"><b>${esc(ev.dayName)} ${esc(ev.dateShort.day)} ${esc(ev.dateShort.month)}</b><span>${esc(ev.time)} · ${esc(ev.cta)}</span></div>
      <div class="v">${esc(ev.venue)}</div><div class="x">${details(ev).join(' · ')}</div>
    </div><div class="stripe" data-deco style="position:absolute;bottom:0;width:100%"></div>`),

  // 3 — Clean white, calendar tile
  ev => shell(`
    body{background:#f5f3ee;color:#16302b;padding:90px;position:relative}
    .cal{width:300px;border-radius:24px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.12);text-align:center;background:#fff}
    .cal .m{background:#1f7a4d;color:#fff;font:800 44px var(--body);padding:16px;text-transform:uppercase}
    .cal .n{font:900 150px/1.1 var(--heavy)} .cal .w{font:600 34px var(--body);padding-bottom:22px;color:#5b6b66}
    h1{font:900 96px/1 var(--heavy);margin:56px 0 24px;max-width:900px}
    .r{font:600 40px var(--body);line-height:1.5}
    .cta{display:inline-block;margin-top:44px;font:800 40px var(--body);color:#1f7a4d;border-bottom:6px solid #1f7a4d;padding-bottom:6px}
  `, `<div class="cal"><div class="m">${esc(ev.dateShort.month)}</div><div class="n">${esc(ev.dateShort.day)}</div><div class="w">${esc(ev.dayName)}</div></div>
    <h1>${esc(ev.eventName)}</h1>
    <div class="r">🕢 ${esc(ev.time)}<br>📍 ${esc(ev.venue)}${details(ev).length ? '<br>🎯 ' + details(ev).join(' · ') : ''}</div>
    <div class="cta">${esc(ev.cta)} →</div>
    ${board(300, 'position:absolute;right:90px;top:90px')}`),

  // 4 — Navy + neon
  ev => shell(`
    body{background:radial-gradient(circle at 75% 20%,#16336b 0,#0a1430 55%,#050a1a 100%);color:#fff;padding:100px;text-align:center}
    .k{font:800 38px var(--body);letter-spacing:10px;color:#3ff0ff;text-transform:uppercase;text-shadow:0 0 18px #3ff0ff}
    h1{font:900 130px/0.95 var(--heavy);text-transform:uppercase;margin:50px 0;text-shadow:0 0 30px rgba(63,240,255,.35)}
    .line{width:200px;height:6px;background:#ff3fb4;margin:0 auto 50px;box-shadow:0 0 18px #ff3fb4}
    .d{font:700 58px var(--body)} .t{font:400 44px var(--body);color:#b9c6e6;margin:10px 0 40px}
    .v{font:600 38px var(--body)} .x{font:500 32px var(--body);color:#8ea0c8;margin-top:14px}
    .cta{display:inline-block;margin-top:60px;border:4px solid #3ff0ff;color:#3ff0ff;padding:20px 50px;border-radius:12px;font:800 38px var(--body);box-shadow:0 0 22px rgba(63,240,255,.5)}
  `, `<div class="k">${esc(ev.dayName)} night darts</div><h1>${esc(ev.eventName)}</h1><div class="line"></div>
     <div class="d">${esc(ev.dateLong)}</div><div class="t">${esc(ev.time)}</div>
     <div class="v">${esc(ev.venue)}</div><div class="x">${details(ev).join(' · ')}</div>
     <div class="cta">${esc(ev.cta)}</div>`),

  // 5 — Red poster, giant day name
  ev => shell(`
    body{background:#c8211b;color:#fff;padding:80px;position:relative;overflow:hidden}
    .big{font:900 300px/0.8 var(--cond);text-transform:uppercase;color:rgba(255,255,255,.12);position:absolute;left:40px;bottom:30px;white-space:nowrap}
    .k{font:800 36px var(--body);letter-spacing:4px;text-transform:uppercase;opacity:.85}
    h1{font:900 124px/0.95 var(--heavy);text-transform:uppercase;margin:22px 0 40px;max-width:920px}
    .d{font:800 60px var(--body)} .t{font:500 44px var(--body);margin:6px 0 34px}
    .v{font:700 38px var(--body)} .x{font:500 32px var(--body);opacity:.85;margin-top:10px}
    .cta{display:inline-block;margin-top:50px;background:#fff;color:#c8211b;padding:22px 44px;font:900 40px var(--heavy);text-transform:uppercase}
  `, `<div class="big" data-deco>${esc(ev.dayName)}</div>
     <div class="k">This ${esc(ev.dayName)}</div><h1>${esc(ev.eventName)}</h1>
     <div class="d">${esc(ev.dateShort.day)} ${esc(ev.dateShort.month)}</div><div class="t">${esc(ev.time)}</div>
     <div class="v">${esc(ev.venue)}</div><div class="x">${details(ev).join(' · ')}</div>
     <div class="cta">${esc(ev.cta)}</div>`),

  // 6 — Split: board on left, text on right
  ev => shell(`
    body{display:flex;background:#101010;color:#fff}
    .l{width:440px;background:#1e5c3a;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .r{flex:1;padding:90px 70px;display:flex;flex-direction:column;justify-content:center}
    .k{font:800 32px var(--body);color:#f2c14e;letter-spacing:5px;text-transform:uppercase}
    h1{font:900 92px/1 var(--heavy);text-transform:uppercase;margin:24px 0 36px}
    .row{font:600 38px var(--body);margin:8px 0} .row i{font-style:normal;color:#f2c14e}
    .cta{margin-top:50px;background:#f2c14e;color:#101010;padding:22px 34px;border-radius:10px;font:900 36px var(--body);align-self:flex-start}
  `, `<div class="l">${board(620, 'flex:none')}</div>
     <div class="r"><div class="k">Darts · ${esc(ev.dayName)}</div><h1>${esc(ev.eventName)}</h1>
      <div class="row"><i>When</i> ${esc(ev.dayName)} ${esc(ev.dateShort.day)} ${esc(ev.dateShort.month)}, ${esc(ev.time)}</div>
      <div class="row"><i>Where</i> ${esc(ev.venue)}</div>
      ${ev.fee ? `<div class="row"><i>Entry</i> ${esc(ev.fee)}</div>` : ''}
      <div class="cta">${esc(ev.cta)}</div></div>`),
];

module.exports = { designs, count: designs.length };
