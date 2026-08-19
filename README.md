# GitHub Readme Streak Stats (Node.js port)

A lightweight **Node.js** service that generates an SVG card showing a GitHub user's contribution streak (total contributions, current streak, longest streak). It is a port of the original [**github-readme-streak-stats**](https://github.com/DenverCoder1/github-readme-streak-stats) rewritten in JavaScript for easy deployment on any platform that supports Node.

---

## Features
- **Daily** or **weekly** streak modes  
- Fully customizable via query parameters (theme, locale, colors, date format, etc.)  
- **SVG output** – ready to embed directly in README files  
- **No header bar** – the card starts with the three statistic columns  
- **Current‑streak column** now shows a **circular progress ring** (radius 40 px, stroke 5 px) with a 🔥 emoji placed in the small gap at the top, giving the classic “almost‑full‑circle” look.  
- Central column label is **bold** and rendered in the **ring colour**.  
- All column content is **vertically centered** in the card; the first (“Total”) and last (“Longest”) columns are nudged **10 px lower** for visual balance.  
- Caches results for 1 hour (configurable)  
- Zero‑dependency front‑end (only Node standard library + Express)

---

## Original project reference
- **Source**: https://github.com/DenverCoder1/github-readme-streak-stats  
- This repository re‑implements the same visual card using **Express** and plain JavaScript.

---

## Technologies used
| Layer | Technology |
|-------|------------|
| Runtime | **Node.js** ≥ 18 |
| Web framework | **Express** |
| HTTP client | native `fetch` (Node 18+) |
| SVG generation | Hand‑crafted template strings (no external SVG lib) |
| Configuration | JSON files (`assets/themes.json`, `assets/locales.json`) |
| Testing | **Jest** (unit tests in `tests/`) |
| Linting / Formatting | **ESLint** + **Prettier** (optional) |

---

## Project architecture
```
src/
 ├─ index.js          # Express server, request handling, wiring
 ├─ github.js         # GitHub GraphQL / REST calls – fetches contribution calendar
 ├─ streaks.js        # Pure functions: calculates total, current & longest streaks
 ├─ card.js           # SVG card generation (formatting, theming, date handling)
 └─ services/
      └─ githubService.js   # Thin wrapper around GitHub API (token handling, pagination)
assets/
 ├─ themes.json       # Color palettes (default, dark, radical, etc.)
 └─ locales.json      # UI strings for i18n (en, pt, es, …)
tests/
 ├─ githubService.test.js
 ├─ github.test.js
 ├─ streaks.test.js
 ├─ card.test.js
 └─ index.test.js
```

* **Stateless** – each request computes the streak from fresh GitHub data (cached 1 h).  
* **Separation of concerns** – data fetching, business logic, and rendering are isolated, making unit testing trivial.  
* **Config‑driven theming** – new themes or locales are added by editing JSON files only.

---

## Getting started

### Prerequisites
- Node.js **≥ 18**  
- A **GitHub Personal Access Token** (classic) with `public_repo` scope (or `read:user` for private contributions).  
  Export it as `GITHUB_TOKEN` (or `TOKEN`) environment variable.  
- (Optional) `WHITELIST` – comma‑separated list of GitHub usernames that are allowed to be queried.  
  If set, requests for users not in the list return a **403** SVG error card (“User not allowed”).

### Installation
```bash
git clone https://github.com/<your‑fork>/github-readme-streak-stats-js.git
cd github-readme-streak-stats-js
npm ci            # install exact versions from package-lock.json
```

### Running locally
```bash
# development (auto‑reload with `node --watch` on Node 18+)
npm run dev       # or: node src/index.js

# production
npm start         # runs: node src/index.js
```
The server starts on **http://localhost:3000** (or the `PORT` env var).

### Example request
```
GET http://localhost:3000/?user=denvercoder1&theme=dark&date_format=D%20MMM%20YYYY
```
Returns an `image/svg+xml` card you can embed:

```markdown
![Streak Stats](https://your-host.com/?user=denvercoder1&theme=dark&date_format=D%20MMM%20YYYY)
```

### Query parameters
| Parameter | Description | Default |
|-----------|-------------|---------|
| `user` / `username` | GitHub login | *required* |
| `theme` | One of the keys in `assets/themes.json` | `default` |
| `locale` | Language code present in `assets/locales.json` | `en` |
| `mode` | `daily` or `weekly` | `daily` |
| `date_format` | Custom date pattern (e.g. `D MMM YYYY`) – tokens: `YYYY, YY, MM, M, DD, D, MMM` | locale short format |
| `hide_total_contributions` | `true` to hide the total column | `false` |
| `hide_current_streak` | `true` to hide current streak column | `false` |
| `hide_longest_streak` | `true` to hide longest streak column | `false` |
| `short_numbers` | Abbreviate large numbers (k, M) | `false` |
| `border_radius` | Card corner radius (0‑248) | `4.5` |
| `disable_animations` | Remove CSS animations | `false` |

---

## Running tests
```bash
npm test
```
Executes the Jest suite covering:

* **githubService** – query building, calendar parsing, GraphQL error handling.  
* **github** – multi‑year aggregation, missing `createdAt`, rate‑limit / not‑found errors.  
* **streaks** – daily & weekly streak calculations (empty, single day, consecutive, gaps, week breaks).  
* **card** – number formatting, date formatting (default, custom tokens `MMM`), theme/locale fallbacks, SVG generation with hide options and custom `date_format`.  
* **index** – Express routes (`/health`, `/` success, 400/404/429/500 error cards, propagation of all query options).

All **34 tests** pass.

---

## Deployment notes
- **Docker** (example `Dockerfile`):
  ```Dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  ENV PORT=3000
  EXPOSE 3000
  CMD ["node","src/index.js"]
  ```
- **Vercel** (serverless function):
  1. Push the repo to GitHub/GitLab/Bitbucket.  
  2. Import the project in Vercel.  
  3. Set **Build Command** to `npm ci` (or leave blank).  
  4. Set **Output Directory** to `.` (no build step).  
  5. Add an environment variable `GITHUB_TOKEN` with your personal access token.  
  6. Deploy – Vercel will expose the Express app as a serverless function at `https://<project>.vercel.app/`.
- Set `GITHUB_TOKEN` in the container / Vercel environment.  
- Put behind a reverse proxy (NGINX, Cloudflare, Vercel, etc.) for TLS and caching.

---

## Contributing
1. Fork & clone.  
2. Create a feature branch.  
3. Add tests for new behaviour.  
4. Run `npm test && npm run lint`.  
5. Open a PR.

---

## License
MIT – see [LICENSE](LICENSE) for details.
