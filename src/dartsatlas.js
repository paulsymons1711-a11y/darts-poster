// Reads a venue's upcoming tournaments from Darts Atlas.
// Accepts a venue link like https://www.dartsatlas.com/venues/wern-fawr-inn (or its /tournaments/calendar page).
const cheerio = require('cheerio');

const BASE = 'https://www.dartsatlas.com';
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const DATE_RE = /(\d{4})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+[A-Za-z]+day\s+(\d{1,2}):(\d{2})\s*(am|pm)\s*(GMT|BST)?/i;
const ID_RE = /^(?:https?:\/\/www\.dartsatlas\.com)?\/tournaments\/([A-Za-z0-9]{8,20})\/?$/;

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (darts-poster)', Accept: 'text/html' } });
  if (!r.ok) throw new Error(`Darts Atlas ${r.status} for ${url}`);
  return r.text();
}

function calendarUrl(venueUrl) {
  const m = venueUrl.match(/\/venues\/([^/?#]+)/);
  if (!m) throw new Error(`Not a Darts Atlas venue link: ${venueUrl}`);
  return `${BASE}/venues/${m[1]}/tournaments/calendar`;
}

function parseDate(m) {
  let h = +m[4] % 12 + (m[6].toLowerCase() === 'pm' ? 12 : 0);
  const utc = Date.UTC(+m[1], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[3], h, +m[5]);
  // Times are UK local; take an hour off in British Summer Time
  const bst = (m[7] || '').toUpperCase() === 'BST';
  return new Date(utc - (bst ? 3600e3 : 0)).toISOString();
}

async function upcomingTournaments(venueUrl) {
  const $ = cheerio.load(await get(calendarUrl(venueUrl)));
  const seen = new Map();
  $('a[href*="/tournaments/"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const id = (href.match(ID_RE) || [])[1];
    const title = $(a).text().replace(/\s+/g, ' ').trim();
    if (!id || !title || seen.has(id)) return;
    // Walk up until the surrounding block contains the date line
    let el = $(a), m = null;
    for (let i = 0; i < 6 && !m; i++) { el = el.parent(); m = el.text().replace(/\s+/g, ' ').match(DATE_RE); }
    if (!m) return;
    seen.set(id, { id, title, url: `${BASE}/tournaments/${id}`, start: parseDate(m) });
  });
  return [...seen.values()].filter(t => new Date(t.start) > new Date()).sort((a, b) => a.start.localeCompare(b.start));
}

// Pulls entry fee + format from the tournament page (best-effort)
async function tournamentDetails(t) {
  const text = cheerio.load(await get(t.url))('body').text().replace(/\s+/g, ' ');
  const fee = (text.match(/entry(?: fee)?[^£]{0,30}£\s?(\d+(?:\.\d{2})?)/i) || [])[1];
  const player = (text.match(/\b(Singles|Doubles|Pairs|Triples|Teams)\b/i) || [])[1];
  const game = (text.match(/\b(501|301|701|Cricket)\b/) || [])[1];
  const [eventName, rest = ''] = t.title.split(' @ ');
  return {
    ...t,
    eventName: eventName.trim(),
    venue: rest.replace(/\(.*?\)/g, '').trim(),
    fee: fee ? `£${fee.replace(/\.00$/, '')}` : '',
    format: [player, game].filter(Boolean).join(' · '),
  };
}

async function getEvents(venueUrl) {
  const list = await upcomingTournaments(venueUrl);
  const out = [];
  for (const t of list) {
    try { out.push(await tournamentDetails(t)); } catch (e) { out.push({ ...t, eventName: t.title.split(' @ ')[0], fee: '', format: '' }); }
  }
  return out;
}

module.exports = { getEvents, parseDate, DATE_RE };
