# Draupne

Personal finance, month by month. A local-first PWA: your data stays in IndexedDB on the device, with no backend and no Docker.

## Develop

```sh
npm install
npm run dev        # http://localhost:3000
```

## Deploy (Cloudflare Pages)

```sh
npx wrangler login # once
npm run deploy     # nuxt generate + wrangler pages deploy
```

Or connect the repo in the Cloudflare dashboard: build command `npm run build`, output directory `.output/public`.

On iPhone, open the site in Safari → Share → **Add to Home Screen**. It then runs full screen and offline, and Safari keeps its data. Use **Settings → Export backup** now and then.

The roadmap lives in orrery, project `draupne`.
