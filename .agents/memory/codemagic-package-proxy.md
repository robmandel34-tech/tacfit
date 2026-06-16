---
name: Codemagic vs Replit package proxy
description: Why Codemagic "Install dependencies" fails with ENOTFOUND package-firewall.replit.local, and how to fix it.
---

# Codemagic build fails: ENOTFOUND package-firewall.replit.local

**Symptom:** Codemagic (or any CI/build outside Replit) fails at `npm ci`/`npm install`
with `npm ERR! code ENOTFOUND ... request to http://package-firewall.replit.local/npm/<pkg>...
getaddrinfo ENOTFOUND package-firewall.replit.local`.

**Cause:** When packages are installed *inside Replit*, Replit's package firewall rewrites
the `"resolved"` URLs in `package-lock.json` to its INTERNAL host
`http://package-firewall.replit.local/npm/...`. That host only resolves inside Replit's
network, so external builders (Codemagic Mac VMs) can't download those tarballs.

**Fix:** Rewrite the affected `resolved` URLs back to the public registry:
`sed -i 's#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#g' package-lock.json`
The `integrity` hashes stay valid (same tarball contents), and the file stays valid JSON.
Do NOT run `npm install` inside Replit afterwards to "verify" — that re-bakes the internal
proxy URLs and undoes the fix. The running dev server is unaffected (uses existing
node_modules), and Codemagic does a fresh install from the corrected lockfile.

**Why it recurs:** every time a NEW package is added via the Replit packager, its lockfile
entry gets the internal proxy URL again. After adding deps in Replit, re-check
`rg -c package-firewall.replit.local package-lock.json` before the next native build.
