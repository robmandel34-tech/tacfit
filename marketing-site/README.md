# TacFit Marketing Site

A self-contained static site (HTML/CSS/JS only). No build step, no server.

## Files
- `index.html` — main marketing page (homepage)
- `contact-us.html` — contact form page
- `privacy.html` — privacy policy
- `marketing/` — images, videos, and the promo poster
- `tacfit-shield.png` — logo
- `netlify.toml` — Netlify config (caching + a small redirect)

## Deploy to Netlify (drag-and-drop, no account-linking needed)

1. Go to https://app.netlify.com/drop
2. Sign up / log in (free).
3. Drag this entire `marketing-site` folder onto the page.
4. Within ~30 seconds you'll get a live URL like `https://random-name-12345.netlify.app`.
   - Open it. The marketing site should look identical to what you saw in Replit.
5. (Optional) Rename the site: in Netlify dashboard → Site settings → Change site name.

## Point your domain `tacfit.app` at it

1. In Netlify: Site settings → Domain management → Add custom domain → enter `tacfit.app`.
2. Netlify will give you DNS records (usually one A record and one CNAME for `www`).
3. Log in to GoDaddy → DNS for tacfit.app → paste in those records.
4. Wait 15 min to a few hours. Netlify will automatically provision an HTTPS certificate.
5. Done — `https://tacfit.app` now shows the marketing site.

## Updating content later

Edit the HTML files directly. To redeploy:
- Drag the folder onto https://app.netlify.com/drop again (creates a new site), OR
- Better: in Netlify dashboard, go to your existing site → Deploys → drag the folder there to update in place.

## What about the actual TacFit app?

The app still lives at its current Replit URL. Add a "Sign In" / "Download" link in the marketing pages that points to it whenever you're ready.
