// One-off helper: turns a short-lived user token into a long-lasting Page token.
// Usage: node src/get-page-token.js APP_ID APP_SECRET SHORT_USER_TOKEN
const { GRAPH } = require('./facebook');
const [appId, secret, shortToken] = process.argv.slice(2);
if (!shortToken) { console.log('Usage: node src/get-page-token.js APP_ID APP_SECRET SHORT_USER_TOKEN'); process.exit(1); }

(async () => {
  const q = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: shortToken });
  const long = await (await fetch(`${GRAPH}/oauth/access_token?${q}`)).json();
  if (long.error) throw new Error(long.error.message);
  const pages = await (await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${long.access_token}`)).json();
  if (pages.error) throw new Error(pages.error.message);
  console.log('\nCopy the matching Page into config.json:\n');
  for (const p of pages.data) console.log(`${p.name}\n  facebookPageId:    ${p.id}\n  facebookPageToken: ${p.access_token}\n`);
})().catch(e => console.error('Error:', e.message));
