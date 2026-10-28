"""Stateless API for the nine-puzzle game book. The shared puzzle file also ships with the frontend."""

import json
from datetime import date
from pathlib import Path

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET, require_http_methods

PUZZLES = json.loads((Path(__file__).resolve().parents[2] / 'data/sai-puzzles.json').read_text())
BY_ID = {p['id']: p for p in PUZZLES}


def valid_solution(puzzle, colours):
    return (
        isinstance(colours, list)
        and len(colours) == len(puzzle['regions'])
        and all(type(c) is int and 0 <= c < 4 for c in colours)
        and all(colours[a] != colours[b] for a, b in (edge['regions'] for edge in puzzle['borders']))
    )


@require_GET
def puzzles(request):
    return JsonResponse(PUZZLES, safe=False)


@require_GET
def daily(request):
    # UTC date: visitors receive the same challenge regardless of local timezone.
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).date()
    puzzle = PUZZLES[(today - date(2026, 1, 1)).days % len(PUZZLES)]
    return JsonResponse({'id': puzzle['id'], 'date': today.isoformat()})


@require_http_methods(['GET', 'POST'])
def validate(request):
    if request.method == 'GET':
        return JsonResponse({'csrfToken': get_token(request)})
    if len(request.body) > 4096:
        return JsonResponse({'error': 'Submission too large.'}, status=400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    if not isinstance(data, dict) or not isinstance(data.get('id'), str):
        return JsonResponse({'error': 'Invalid puzzle.'}, status=400)
    puzzle = BY_ID.get(data['id'])
    if puzzle is None:
        return JsonResponse({'error': 'Unknown puzzle.'}, status=404)
    return JsonResponse({'valid': valid_solution(puzzle, data.get('colours'))})
