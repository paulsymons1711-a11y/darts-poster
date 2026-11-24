// Free, rotating caption wording (no AI cost). Add your own lines any time.
const OPENERS = [
  '🎯 Darts is on at {venue}!',
  '🎯 {day} night means darts at {venue}.',
  'Fancy a game? 🎯',
  '🎯 Get your arrows ready!',
  'Who\'s throwing this {day}? 🎯',
  '🎯 Board\'s set, oche\'s ready – are you?',
  'Darts night is back at {venue} 🎯',
];
const MIDDLES = [
  '{event} – {date} at {time}.',
  'Join us for {event} on {date}, start {time}.',
  '{event} kicks off {date} at {time}.',
];
const EXTRAS = [
  'All abilities welcome – come and have a go.',
  'Spaces are limited, so get your name down early.',
  'Bring your mates and make a night of it.',
  'Great games, good company – see you on the oche.',
  'First to sign up get the spots.',
];
const CLOSERS = ['👉 Sign up here: {url}', '📝 Book your spot: {url}', '✅ Register here: {url}', '🔗 Sign up: {url}'];
const LAST_CALL = ['⏰ TONIGHT! Last chance to get your name down.', '⏰ It\'s tonight – still time to sign up!'];

const pick = a => a[Math.floor(Math.random() * a.length)];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

function makeCaption(ev, venueName, isEventDay) {
  const d = new Date(ev.start);
  const v = {
    venue: venueName,
    event: ev.eventName,
    day: d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'long' }),
    date: d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' }),
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ''),
    url: ev.url,
  };
  const lines = [
    isEventDay ? pick(LAST_CALL) : pick(OPENERS),
    pick(MIDDLES),
    [ev.fee && `Entry ${ev.fee}`, ev.format].filter(Boolean).join(' · '),
    pick(EXTRAS),
    pick(CLOSERS),
  ].filter(Boolean);
  return lines.map(l => fill(l, v)).join('\n\n');
}

module.exports = { makeCaption };
