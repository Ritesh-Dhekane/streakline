# Streakline

An elegant view of anyone's **public** GitHub activity. Enter a username and get
their contribution heatmap, streaks, rhythm, languages, top repositories and the
projects they contribute to — on one calm, readable page.

Live: https://ritesh-dhekane.github.io/streakline/ (coming soon)

## How it works

```
GitHub Pages (this site)  ──▶  Cloudflare Worker (/api)  ──▶  GitHub API
static React app               holds the GitHub token,         public data only
                               caches each profile
```

- The site is static and hosted on GitHub Pages.
- A small Cloudflare Worker fetches data from GitHub. It holds the GitHub token as a
  Cloudflare secret, so the token never reaches the browser and is never in this repo.
- The token only has read access to public repositories, so private data can't be
  fetched even by mistake. Streakline only ever shows public activity.

## Development

Requirements: Node.js 20+ and **npm 11** (`npm install -g npm@11` — npm 10.9 fails to
resolve this project's dependencies).

```
npm install
cp .env.example .env
npm run dev          # site on http://localhost:5173/streakline/
```

| Command             | Does                            |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the site locally          |
| `npm run build`     | Type-check and build to `dist/` |
| `npm test`          | Run the tests                   |
| `npm run lint`      | Lint (oxlint)                   |
| `npm run typecheck` | TypeScript only                 |
| `npm run format`    | Format with Prettier            |

## Project layout

```
src/       the website (React + TypeScript + Tailwind)
shared/    types and calculations shared by the site and the Worker
worker/    the Cloudflare Worker API
```

## License

[MIT](LICENSE) © 2026 Ritesh Dhekane
