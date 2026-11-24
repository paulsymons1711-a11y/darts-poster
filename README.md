# Darts Poster

This app reads a venue's upcoming events from Darts Atlas. For each event it makes an image (one of 6 plain designs at random) and a caption, then posts them to the venue's Facebook Page. Over time it learns which posting times get the most likes, comments and shares. You manage everything from the dashboard on your phone.

## Install (mini PC)
1. Unzip the folder, for example to `C:\darts-poster`.
2. Double-click **INSTALL.bat**. If it installs Node.js first, run it a second time.
3. Choose a dashboard password when it asks.

The app then starts, runs in the background and starts again with Windows.

## Open it on your phone
- **At home (same Wi-Fi):** use the link that INSTALL.bat shows, for example `http://192.168.1.50:3060`.
- **Anywhere:** in the Cloudflare dashboard, add a public hostname to your **Master** tunnel: `posts.bullseyebroadcast.xyz` → `http://localhost:3060`. The app has its own password login.
- **Home screen:** open the link, then use Share → Add to Home Screen to get the dartboard app icon.

## Settings (bottom of the dashboard)
- Test mode on or off
- Posting times to try
- For each venue: the name on the images, the Darts Atlas link, posts per event, and the Facebook Page ID and token
- Updates from GitHub
- Change your password

## Connect a Facebook Page (one-off)
1. Go to developers.facebook.com and choose My Apps → Create App (type **Business**).
2. Open **Tools → Graph API Explorer**, pick the app, then click **Get User Access Token** and tick `pages_show_list`, `pages_manage_posts` and `pages_read_engagement`.
3. On the mini PC, run: `node src\get-page-token.js APP_ID APP_SECRET PASTE_TOKEN`
4. Paste the Page ID and token into Settings, save, and turn Test mode off.

## Automatic updates
These work the same way as the Telegram bot. On GitHub, create a fine-grained token with **Contents: Read-only** for the `darts-poster` repo only. Paste it into **Settings → Updates from GitHub** and tick **Install new versions automatically**.
- New versions are installed within the hour, checked for errors first, with the old files kept in `backup\`.
- Your settings, queue and images are in `data\` and are never touched by updates.
