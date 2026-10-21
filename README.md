# Quoderat — The Living Archive

A portable learning project: **React + TypeScript (TSX) + MUI + Vite** in the browser, **Django + SQLite** on your server. The 27 entries are taken from Gordon Ji's four bilingual Quoderat source documents and the Chinese terminology sheet, verified against Google Drive on 20 October 2026; original source files are not modified.

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

## How the pieces connect

```text
React UI → src/api.ts → GET /api/articles/ → Django view → Article model → SQLite
                      ↘ bundled JSON (Sites edition)
Django admin → authenticated/CSRF-protected edit → Article model
```

`src/main.tsx` contains the three-column reading layout, category navigation, search, bookmarks and editor dialog. `src/styles.css` handles responsive layout and the visual design; MUI supplies accessible dialogs, fields, buttons and notices. `src/api.ts` is the data boundary: the UI receives the same Article shape in either mode. `backend/wiki/models.py` defines persistence, `views.py` exposes read-only JSON, and `admin.py` supplies authenticated authoring. Markdown is rendered by react-markdown with GitHub-style tables; raw HTML is not executed.

We use separate React and Django applications rather than Django HTML templates so you can learn each layer independently. Vite proxies `/api` locally, avoiding unnecessary cross-origin configuration. Django's built-in admin provides real persistent editing while you learn; the next useful exercise is replacing it with an authenticated React editor using sessions and CSRF protection.

## Checks

```sh
npm run build
python backend/manage.py check
python backend/manage.py test wiki
```

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

The Characters category contains all 11 named or titled Pantheon figures, with individual English and Chinese pages generated by `scripts/import-lore.py` from the source snapshots.
