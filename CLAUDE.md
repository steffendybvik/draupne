# Draupne

Local-first personal finance PWA. Nuxt 4 (SPA, `ssr: false`) + Tailwind 4, data in IndexedDB via Dexie, deployed as static files to Cloudflare Pages. No backend, no Docker.

## Roadmap

The roadmap is in orrery (http://localhost:9010), project `draupne`, issue ids `DRA-n`. How to use it: `curl -s http://localhost:9010/llms-full.txt`.

- Work from an issue: set it to `in-progress` (assignee `claude`) before starting, comment as it moves, `done` when it ships (`canceled` when it's dropped).
- Knowledge (decisions, how things work) goes in the project's docs.
- Send `Orrery-Actor: claude` on every write. orrery hands out ids; don't send one.
- With orrery's server in `.mcp.json`, its tools (`issue`, `start_issue`, `comment`, `finish_issue`, …) do all of this without curl.
