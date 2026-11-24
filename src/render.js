const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { designs } = require('./templates');

const CTAS = ['Sign up now', 'Book your spot', 'Get your name down', 'Spaces limited – sign up', 'Join the board'];
const pick = a => a[Math.floor(Math.random() * a.length)];

// Turn a scraped event into the fields the templates need
function toCard(ev, venueName) {
  const d = new Date(ev.start);
  const opt = (o) => d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', ...o });
  return {
    eventName: ev.eventName,
    venue: venueName || ev.venue,
    dayName: opt({ weekday: 'long' }),
    dateLong: opt({ weekday: 'long', day: 'numeric', month: 'long' }),
    dateShort: { day: opt({ day: 'numeric' }), month: opt({ month: 'short' }) },
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ''),
    fee: ev.fee,
    format: ev.format,
    cta: pick(CTAS),
  };
}

let browser;
async function getBrowser() {
  if (!browser) browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  });
  return browser;
}

// Renders one PNG; design = index or undefined for random. Returns { file, design }
async function renderImage(ev, venueName, outFile, design) {
  const i = design ?? Math.floor(Math.random() * designs.length);
  const html = designs[i](toCard(ev, venueName));
  const page = await (await getBrowser()).newPage();
  await page.setViewport({ width: 1080, height: 1080 });
  await page.setContent(html, { waitUntil: 'load' });
  // Shrink the title until all text fits inside the image
  await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const over = () => [...document.querySelectorAll('body *')].some(el => {
      if (el.closest('[data-deco]') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
      const r = el.getBoundingClientRect();
      return r.bottom > 1050;
    }) || (h1 && h1.scrollWidth > h1.clientWidth + 2) || [...document.querySelectorAll('h1')].some(el => {
      const r = el.getBoundingClientRect(); return r.right > 1060 || r.top < 20;
    });
    for (let i = 0; i < 20 && h1 && over(); i++) {
      const fs = parseFloat(getComputedStyle(h1).fontSize);
      h1.style.fontSize = fs * 0.92 + 'px';
    }
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.screenshot({ path: outFile, type: 'png' });
  await page.close();
  return { file: outFile, design: i };
}

async function closeBrowser() { if (browser) await browser.close(); browser = null; }

module.exports = { renderImage, closeBrowser, toCard };
