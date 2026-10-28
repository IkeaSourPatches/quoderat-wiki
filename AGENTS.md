# Quoderat wiki — agent instructions

Shared rules for every AI agent working in this repo (Codex reads this file; Claude reads it via `CLAUDE.md`).

## Canon

- Lore canon lives in Gordon's Google Drive "Quoderat" folder (Worldbuilding Notes, The Pantheon, Creatures, Timeline). Drive is the upstream source of truth.
- `data/sources/` holds local snapshots of those documents; see `data/sources/README.md` for links and the snapshot date. Read the relevant snapshot before answering or editing project content.
- Snapshots are not synchronized automatically. When asked for the newest information, refresh from Drive with a connector if one is available; otherwise use the snapshots and state their retrieval date. Preserve source wording when refreshing; keep commentary and proposals separate.
- `data/articles.json` and the Django database are generated or edited wiki content, not an independent canon authority.
- User instructions and explicit canon corrections take precedence. Flag disagreements between source documents instead of silently resolving them or inventing rules.
- `data/sources/证毕 中文术语表.md` is the Chinese terminology glossary; use it for translations.

## Working together

- Two agents (Claude and Codex) may work on this repo at the same time. Never commit directly to `main`; work on your own branch and merge through a pull request.
- Pull before starting and keep commits small, so the large `src/main.tsx` doesn't produce painful merge conflicts.
- Don't commit `.venv/`, `node_modules/`, `dist/`, `*.sqlite3` or `.env` (already in `.gitignore`).
- Unbuilt or retired design ideas live in `ideas.md`. Add to it instead of deleting an idea.

## Checks before pushing

`make check` runs the commands below. `make format` (Prettier + Ruff) rewrites files to the project style; `make lint` checks without writing. Install the Python dev tools with `pip install -r backend/requirements-dev.txt`. Run `make format` and `make lint` before committing.

```sh
npm run build
node scripts/check-localization.mjs   # bilingual data contract (Node 22.18+, native TypeScript)
node scripts/check-game.mjs           # Sai's puzzles, the court cases, Keep it flat
python backend/manage.py check
python backend/manage.py test wiki
```

Run the Python commands from the activated `.venv/`; the system `python3` may not have Django installed. Target Python 3.12 or 3.13 for deployment (Django 5.2).
