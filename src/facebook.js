// Posting to a Facebook Page with the official Graph API (normal posts, not ads).
const fs = require('fs');
const path = require('path');
const GRAPH = 'https://graph.facebook.com/v26.0';

async function call(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json();
  if (j.error) throw new Error(`Facebook: ${j.error.message}`);
  return j;
}

// Photo post with caption. Returns the post id.
async function postPhoto(pageId, pageToken, imageFile, caption) {
  const form = new FormData();
  form.append('source', new Blob([fs.readFileSync(imageFile)], { type: 'image/png' }), path.basename(imageFile));
  form.append('message', caption);
  form.append('access_token', pageToken);
  const j = await call(`${GRAPH}/${pageId}/photos`, { method: 'POST', body: form });
  return j.post_id || j.id;
}

// Simple engagement score: reactions + 2×comments + 3×shares
async function engagement(postId, pageToken) {
  const f = 'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares';
  const j = await call(`${GRAPH}/${postId}?fields=${encodeURIComponent(f)}&access_token=${pageToken}`);
  const reactions = j.reactions?.summary?.total_count || 0;
  const comments = j.comments?.summary?.total_count || 0;
  const shares = j.shares?.count || 0;
  return { reactions, comments, shares, score: reactions + 2 * comments + 3 * shares };
}

module.exports = { postPhoto, engagement, GRAPH };
