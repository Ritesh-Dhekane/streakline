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

| Command                 | Does                             |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start the site locally           |
| `npm run build`         | Type-check and build to `dist/`  |
| `npm test`              | Run the tests                    |
| `npm run lint`          | Lint (oxlint)                    |
| `npm run typecheck`     | TypeScript only                  |
| `npm run format`        | Format with Prettier             |
| `npm run worker:dev`    | Run the API locally on port 8787 |
| `npm run worker:deploy` | Deploy the API to Cloudflare     |

### Running the API locally

1. Create a GitHub token (see below) and put it in `.dev.vars` (git-ignored):
   `cp .dev.vars.example .dev.vars`, then replace the placeholder.
2. `npm run worker:dev` — the API runs on http://localhost:8787, e.g.
   http://localhost:8787/api/user/octocat
3. In another terminal, `npm run dev` for the site (`.env` already points at port 8787).

## Deploying the API (Cloudflare Worker)

### 1. Create the GitHub token (public data only)

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name `streakline-api`, expiration up to 1 year.
3. **Repository access: Public repositories (read-only)**. Leave every permission at "No access".
4. Generate and copy the token. It can only read public data, so even a mistake can't expose
   anything private.

### 2. Deploy the Worker

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up (no card needed).
2. `npx wrangler login` — opens the browser once to connect Wrangler to your account.
3. `npm run worker:deploy` — prints the Worker's URL, e.g.
   `https://streakline-api.<your-subdomain>.workers.dev`.
4. `npx wrangler secret put GITHUB_TOKEN` — paste the token when asked. It's stored encrypted
   in Cloudflare and never in this repository.
5. Check it: open `<worker URL>/api/user/octocat`.

The site reads the Worker URL from `VITE_API_BASE` at build time. Allowed browser origins are
set in `wrangler.toml` (`ALLOWED_ORIGINS`).

### 3. Publish the site

Every push to `main` runs checks and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). One-time setup in the repository settings:

1. **Pages** → Build and deployment → Source: **GitHub Actions**.
2. **Secrets and variables → Actions → Variables** → add `VITE_API_BASE` with the Worker URL.
   Re-run the workflow after changing it.

## Project layout

```
src/       the website (React + TypeScript + Tailwind)
shared/    types and calculations shared by the site and the Worker
worker/    the Cloudflare Worker API
```

## License

[MIT](LICENSE) © 2026 Ritesh Dhekane
