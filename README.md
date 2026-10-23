# Quoderat — The Living Archive

A portable learning project: **React + TypeScript (TSX) + MUI + Vite** in the browser, **Django + SQLite** on your server. The 45 entries — 20 characters, 8 pantheon, 9 creatures, 7 world and laws, 1 timeline — are taken from Gordon Ji's four bilingual Quoderat source documents and the Chinese terminology sheet. Pantheon and Creatures were verified against Google Drive on 22 October 2026 and the other snapshots on 20 October 2026; original source files are not modified.

## Run the frontend

```sh
npm install
npm run dev
```

Without configuration, React loads `data/articles.json`. This is also how the private Sites edition works: Sites hosts the compiled frontend, not Python/Django. Bookmarks stay in your browser. The Markdown playground previews and downloads drafts; it deliberately does not pretend to save to a server.

## Run the full stack

From this directory:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_wiki
python backend/manage.py createsuperuser
python backend/manage.py runserver
```

In another terminal:

```sh
VITE_API_BASE=/api npm run dev
```

Open the URL printed by Vite. Visit `http://127.0.0.1:8000/admin/` to sign in and create/edit persistent articles and character attributes. Reload the frontend after admin edits. `seed_wiki` imports missing entries without overwriting your edits; `seed_wiki --replace` intentionally restores the bundled content.

## Pages and routes

The frontend is one page with hash routing; there is no router library. Every view is a shareable URL and survives a reload.

| Hash | View | Component |
| --- | --- | --- |
| `#home` | World entrance: premise, featured people, invitation to the library | `src/WorldHome.tsx` |
| `#lore` | Library index of the four setting sections | `src/LoreHome.tsx` |
| `#lore/<category>` | Catalogue for one section: `World & laws`, `The pantheon`, `Creatures`, `Timeline` | `src/main.tsx` |
| `#characters` | Character gallery with emblems and held laws | `src/main.tsx` |
| `#browse` | Every entry, characters included | `src/main.tsx` |
| `#saved` | Bookmarks held in the browser | `src/main.tsx` |
| `#suggestions` | Letter to the author | `src/SuggestionBox.tsx` |
| `#play` | The games shelf | `src/game/GameShelf.tsx` |
| `#play/sai` | Sai's map-colouring puzzle book | `src/game/SaiGame.tsx` |
| `#play/flat` | Keep it flat: hold an assembly level while the floor tilts | `src/game/KeepItFlat.tsx` |
| `#play/court` | The Spear and Shield's court: find the evidence a testimony contradicts | `src/game/SpearShieldCourt.tsx` |
| `#play/axiom` | The Axiom's test: a switch that turns itself back off | `src/game/AxiomMachine.tsx` |
| `#timeline` | The timeline as one living scene you can rewind | `src/timeline/WorldRewound.tsx` |
| `#<slug>` | One article, for example `#ilar-hesabu` | `src/main.tsx` |

Client state stays deliberately plain: language in `quoderat-language`, bookmarks in `quoderat-bookmarks`, puzzle progress in `quoderat-sai-v1`, attempts on the Axiom in `quoderat-axiom-attempts`, Aldous Vane's ledger of finished assemblies in `quoderat-flat-ledger`, and closed court cases in `quoderat-court-solved`. Nothing else is persisted, and no account is involved.

## How the pieces connect

```text
React views   → src/api.ts → GET /api/articles/ → views.py → Article → SQLite
                           ↘ data/articles.json (Archive/Sites edition)
SuggestionBox → GET + POST /api/suggestions/ → view + CSRF token → Suggestion → SQLite
SaiGame       → GET /api/game/puzzles|daily/ · POST /api/game/validate/ → data/sai-puzzles.json
Django admin  → authenticated, CSRF-protected edit → Article
```

`src/main.tsx` holds the reading layout, article catalogue, search, bookmarks, Markdown workspace and the shared breadcrumb/search/language top bar. `WorldHome.tsx`, `LoreHome.tsx`, `timeline/WorldRewound.tsx`, `SuggestionBox.tsx` and the games in `game/` are the destination views it swaps in. `src/i18n.ts` owns the interface dictionary and merges `translations.zh` into an article; `src/styles.css` carries the responsive design, and MUI supplies accessible dialogs, fields, buttons and notices. `src/api.ts` is the data boundary: the UI receives the same Article shape in either mode. Markdown is rendered by react-markdown with GitHub-style tables; raw HTML is not executed.

On the server, `backend/wiki/models.py` defines persistence, `views.py` exposes read-only article JSON and the rate-limited suggestion endpoint, `game.py` serves puzzle data and validates colourings, and `admin.py` supplies authenticated authoring. The article API is read-only by design: a `POST` to `/api/articles/` answers `405`.

| Method | Path | Behaviour |
| --- | --- | --- |
| `GET` | `/api/articles/` | Every article; optional `?category=` filter |
| `GET` | `/api/articles/<slug>/` | One article, or `404` |
| `GET`, `POST` | `/api/suggestions/` | `GET` issues a CSRF token; `POST` stores one private letter |
| `GET` | `/api/game/puzzles/` | The nine puzzle definitions |
| `GET` | `/api/game/daily/` | Today's UTC puzzle id |
| `GET`, `POST` | `/api/game/validate/` | `GET` issues a CSRF token; `POST` checks a completed colouring |

We use separate React and Django applications rather than Django HTML templates so you can learn each layer independently. Vite proxies `/api` locally, avoiding unnecessary cross-origin configuration. Django's built-in admin provides real persistent editing while you learn; the next useful exercise is replacing it with an authenticated React editor using sessions and CSRF protection.

## Checks

```sh
npm run build                          # tsc --noEmit, then the Vite production build
node scripts/check-localization.mjs    # bilingual data contract and timeline text, Node 22.18+
node scripts/check-timeline.mjs        # reduced motion, visibility, animation cleanup
node scripts/check-game.mjs            # Sai's puzzles, the court cases, Keep it flat
python backend/manage.py check
python backend/manage.py test wiki
```

Run the Python commands from the activated `.venv`; several systems ship a `python3` without Django installed.

## Move to your own server

1. Copy this project, excluding `.venv`, `node_modules` and local databases. Back up and transfer the database separately if it contains your edits.
2. Build with `VITE_API_BASE=/api npm run build`. Vite injects this setting at build time.
3. Serve `dist/` through Nginx or another static web server. Proxy `/api/` and `/admin/` to Django on the **same origin**. Serve Django's collected admin assets under `/static/`.
4. Install Python requirements, run migrations, create an admin user, then `python backend/manage.py collectstatic --noinput`.
5. Set `DJANGO_DEBUG=false`, a strong `DJANGO_SECRET_KEY`, and comma-separated `DJANGO_ALLOWED_HOSTS`. Use HTTPS. If TLS terminates at a reverse proxy, configure Django's trusted proxy header only after ensuring the proxy strips client-supplied forwarding headers.
6. Start the application from `backend/` with `gunicorn config.wsgi:application`. Run `manage.py check --deploy` and address settings for your actual infrastructure before opening it to others.

SQLite is a convenient initial database; PostgreSQL is a later migration option. No Sites runtime API is required by the application. `.openai/hosting.json` is only the current Sites publishing configuration.

## Content boundaries

The archive reproduces fictional worldbuilding notes, not a mathematics textbook. Claims and unresolved questions are retained as written. Character attributes summarize source notes; there are no invented combat scores. If notes conflict, the wiki does not silently resolve canon.

## Refresh lore

Google Drive is the canon source; see `data/sources/README.md` for links. Refresh the four text snapshots, then run `python3 scripts/import-lore.py` and `npm run build`. The importer restores Markdown structure, keeps existing article URLs, and separates source discrepancies from lore. It does not fetch Drive automatically. Local Django edits are independent; compare them before using `seed_wiki --replace`, which overwrites bundled entries.

## English / 中文

The top-bar toggle changes the interface, article text, headings and dossiers. Your selection is stored locally; switching languages preserves the article URL, category and bookmarks. Search matches either language. Chinese prose comes directly from the Chinese tabs in the source documents.

Each `Article` keeps English fields and a `translations.zh` object with `title`, `body`, and `stats`. Django returns both together so switching is immediate and works in both API and bundled modes. Category and stat keys remain stable; the interface translates their labels. Edit translations in Django admin, or refresh the bilingual source snapshots and rerun the importer. New articles without Chinese text explicitly fall back to English.

Run `node scripts/check-localization.mjs` (Node 22.18+ with native TypeScript support) and `python backend/manage.py test wiki` to verify the bilingual data contract.

The local development server opens at http://127.0.0.1:5980/ (`npm run dev`). Port 5980 is fixed; stop the process using it if Vite reports it is occupied.

The Characters category contains 20 named or titled figures (16 Pantheon figures and four dragon elders), with individual English and Chinese pages generated by `scripts/import-lore.py` from the source snapshots.

## Suggestion box limits

`POST /api/suggestions/` is rate-limited so a public deployment cannot be flooded. Every attempt counts, including invalid ones. Over the limit, Django answers `429` with a `Retry-After` header, and the letter form tells the visitor to try later without losing their text.

| Setting | Default | Meaning |
| --- | --- | --- |
| `SUGGESTION_LIMIT_PER_IP_HOUR` | `5` | Letters per visitor address per clock hour |
| `SUGGESTION_LIMIT_PER_DAY` | `200` | Letters from everyone per day, a backstop against rotating addresses |
| `DJANGO_TRUST_X_REAL_IP` | `false` | Read the visitor address from `X-Real-IP` set by your proxy |
| `DJANGO_CACHE_DIR` | `backend/.cache` | Where production keeps the counters, shared by all gunicorn workers |

Behind Nginx, Django sees every request as coming from `127.0.0.1`, so all visitors would share one limit. Pass the real address and enable `DJANGO_TRUST_X_REAL_IP=true`. The proxy must overwrite the header, or visitors could forge it:

```nginx
limit_req_zone $binary_remote_addr zone=letters:1m rate=10r/m;

location /api/suggestions/ {
    limit_req zone=letters burst=5 nodelay;   # optional first line of defence
    proxy_set_header X-Real-IP $remote_addr;
    proxy_pass http://127.0.0.1:8000;
}
```

In development (`DJANGO_DEBUG=true`) the counters live in process memory and reset when `runserver` restarts.

## The timeline

`#timeline` shows the timeline article as one scene: laws hang in the sky, Llama and Origo sit either side of the Limitrest Range, and a slider has one stop for each floor of the doc and one for each act of the Feud. Stepping forward plays each moment in order; stepping back rewinds it. A named moment picker makes all ten stops accessible without dragging. Select a scene object or use the keyboard-accessible inspector below it to read its details. Play begins at the current moment; at the end it restarts from Creation. `src/timeline/world.ts` reads the floors, acts, myths and fates out of the article and holds the scene's layout, `fx.ts` moves the camera, the laws and the canvas particles, and `WorldRewound.tsx` draws the scene and the text of one moment beside it. The doc's own wording, including "How to Read the Tower" and its floors, is unchanged.

## The games shelf

`#play` shelves four small games, each built on one character's law. They are adaptations: dialogue, maps, cases and events are not additions to canon, and each game says so on its page. Progress stays on the visitor's device, with no account or leaderboard. `src/game/games.css` holds the shelf styles the games share.

| Game | Law and holder | You |
| --- | --- | --- |
| Sai's Impossible Advertisement | Four Color Theorem, Sai | Recolour nine botched maps so no neighbours match |
| Keep it flat | Iron Law of Oligarchy, Aldous Vane | Keep a standing committee from forming in a tilting hall |
| The Spear and Shield's court | Law of Non-Contradiction, the Spear and Shield | Press testimony, then present the evidence it contradicts |
| The Axiom's test | Law of All Laws, vacant since the first law holder died | Try to score one point against the Axiom |

### Sai’s Impossible Advertisement

Open `#play/sai` for nine bilingual SVG map-colouring puzzles. Each region is a graph vertex; only shared edges create adjacency. Puzzle geometry and borders live in `data/sai-puzzles.json`, shared by React and Django.

Django serves `GET /api/game/puzzles/`, `GET /api/game/daily/` (UTC, rotating through the nine maps), and `GET/POST /api/game/validate/`. GET validation issues a CSRF token; POST checks the complete colouring against the server’s puzzle data. The frontend validates locally too, so puzzles remain playable when the backend is unavailable. The Vite `/api` proxy reaches Django during local development; production should route `/api` to Django on the same origin. A separate backend origin needs the same CORS and CSRF configuration as the rest of the app.

### Keep it flat

The simulation lives in `src/game/flat/sim.ts`, free of drawing code, so the checks can run it without a browser; `KeepItFlat.tsx` draws it on a canvas. Members with time drift towards the dais and busy members drift out the doors. When three time-rich members hold the dais for three seconds, they become a standing committee and the run ends; an assembly that shrinks below four people dissolves instead. Tap a member to nudge them back, or drag to fling them. The floor tilts a little more every year, Aldous's heirs join at years 8 and 16, and Aldous himself arrives at year 22. Every run ends as an entry in his ledger.

### The Spear and Shield’s court

`src/game/court/cases.ts` holds three bilingual cases as data: a witness, the evidence, and testimonies whose statements can be pressed or contradicted. Each testimony has exactly one contradiction, and pressing the right statement can draw out a hidden one. A wrong present costs the cat some patience; when it runs out, the cat leaves and the witness starts again from the top.

### The Axiom’s test

`AxiomMachine.tsx` is a useless machine: flip the switch and an arm comes out of the box to flip it back. Every attempt scores zero, as canon requires; only the count of attempts is kept.

Run `node scripts/check-game.mjs` to check map solvability, adjacency and save data; that every court case is complete in both languages, with exactly one contradiction per testimony; and that Keep it flat always ends on its own. Django game tests are included in `python backend/manage.py test wiki`.

## Ideas

Design ideas that are not built yet, or that were replaced, are kept in `ideas.md`, with pointers to any code that exists for them.
