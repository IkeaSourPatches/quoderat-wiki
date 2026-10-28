# Developer shortcuts. Python targets use the project virtualenv in .venv/.
PY := .venv/bin/python
RUFF := .venv/bin/ruff

.PHONY: format lint check

# Rewrite files in place to the project style.
format:
	npx prettier --write .
	$(RUFF) check --fix --select I backend scripts
	$(RUFF) format backend scripts

# Report style problems without changing files.
lint:
	npx prettier --check .
	$(RUFF) format --check backend scripts
	$(RUFF) check backend scripts

# The pre-push checks from AGENTS.md.
check:
	npm run build
	node scripts/check-localization.mjs
	node scripts/check-game.mjs
	$(PY) backend/manage.py check
	$(PY) backend/manage.py test wiki
