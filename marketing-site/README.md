# TacFit Marketing Site

Self-contained static site. No build step, no server.

## Deploy to Netlify (2 minutes)
1. Go to https://app.netlify.com/drop and sign up (free).
2. Drag this entire `marketing-site` folder onto the page.
3. You'll get a live URL like https://random-name.netlify.app within ~30 seconds.

## Point tacfit.app at it
Site settings → Domain management → Add custom domain → enter `tacfit.app`.
Netlify gives you DNS records — paste them into GoDaddy's DNS editor.
HTTPS is automatic. Live in ~15 min to a few hours.

## Sign-in
The "Sign In" buttons go to https://tacfit.replit.app (your live app).
Change those links in `index.html` if your app URL ever changes.
