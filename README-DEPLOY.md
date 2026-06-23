# Deploy — NihonCheck

Static deploy for [gnomo29/nihoncheck](https://github.com/gnomo29/nihoncheck). The app is vanilla HTML/CSS/JS; `npm run build` copies assets into `dist/` (no bundler).

## GitHub Pages (recommended)

| Item | Value |
|------|--------|
| **Workflow** | `.github/workflows/deploy.yml` |
| **Trigger** | Push to `master` (repo default branch) or manual *workflow_dispatch* |
| **Publish directory** | `dist/` |
| **Site URL** | https://gnomo29.github.io/nihoncheck/ |

### One-time repo settings

1. **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions** (not “Deploy from a branch”).
2. After the first successful workflow run, open the URL above.

### Base path (`/nihoncheck/`)

Project Pages serve the site under `/nihoncheck/`, not at the domain root.

- HTML uses relative URLs (`styles.css`, `js/app.js`), so the UI loads correctly under that prefix.
- **Lookup API** (`/api/lookup`, `/api/reports`) needs `node server.js` locally or a separate backend; it does not run on Pages-only hosting.
- **PWA** (if you add `manifest.webmanifest` and a service worker): set `start_url`, `scope`, and SW `register()` paths to the subpath, e.g. `/nihoncheck/` and `/nihoncheck/sw.js`. Use relative manifest links in HTML (`href="manifest.webmanifest"`).

Local preview of the built site:

```bash
npm run build
npx --yes serve dist -l 5000
```

Open http://localhost:5000/ (root). To mimic Pages, serve under a subpath with a reverse proxy or open `dist/index.html` via a server that mounts at `/nihoncheck`.

## Vercel (alternative)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. `vercel.json` sets `buildCommand` → `npm run build` and `outputDirectory` → `dist`.
3. Production URL is typically `https://<project>.vercel.app` at the **site root** (no `/nihoncheck/` prefix unless you configure a custom `basePath` in the app).

Lookup still requires deploying `server.js` as a separate Node service or using Vercel serverless routes if you add them later.

## CI steps (workflow)

1. `npm install` (no `package-lock.json` in repo yet; add a lockfile later to switch to `npm ci`)
2. `npm run build` → `scripts/build.js`
3. Deploy `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages`
