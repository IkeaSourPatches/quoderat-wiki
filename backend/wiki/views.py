from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Article

FIELDS = ('slug', 'title', 'category', 'body', 'source', 'stats', 'translations')


@require_GET
def articles(request):
    rows = Article.objects.all()
    if request.GET.get('category'):
        rows = rows.filter(category=request.GET['category'])
    return JsonResponse(list(rows.values(*FIELDS)), safe=False)


@require_GET
def article_detail(request, slug):
    row = get_object_or_404(Article, slug=slug)
    return JsonResponse({field: getattr(row, field) for field in FIELDS})


# GET issues a CSRF token; POST accepts feedback without exposing other submissions.
import json
import time

from django.conf import settings
from django.core.cache import cache
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods

from .models import Suggestion


def client_ip(request):
    # Only trust X-Real-IP when settings say the reverse proxy overwrites it.
    if settings.TRUST_X_REAL_IP and request.META.get('HTTP_X_REAL_IP'):
        return request.META['HTTP_X_REAL_IP']
    return request.META.get('REMOTE_ADDR', 'unknown')


def over_limit(key, limit, window):
    """Fixed-window counter in the cache; True once this window exceeds the limit."""
    cache.add(key, 0, window)
    try:
        count = cache.incr(key)
    except ValueError:  # The entry expired between add() and incr().
        cache.set(key, 1, window)
        count = 1
    return count > limit


@require_http_methods(['GET', 'POST'])
def suggestions(request):
    if request.method == 'GET':
        return JsonResponse({'csrfToken': get_token(request)})
    now = int(time.time())
    if over_limit(
        f'suggest:ip:{client_ip(request)}:{now // 3600}', settings.SUGGESTION_LIMIT_PER_IP_HOUR, 3600
    ) or over_limit(f'suggest:all:{now // 86400}', settings.SUGGESTION_LIMIT_PER_DAY, 86400):
        response = JsonResponse({'error': 'Too many letters. Please try again later.'}, status=429)
        response['Retry-After'] = str(3600 - now % 3600)
        return response
    if len(request.body) > 20000:
        return JsonResponse({'error': 'Message too large.'}, status=400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid message.'}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({'error': 'Invalid message.'}, status=400)
    name, message = data.get('name', ''), data.get('message', '')
    if (
        not isinstance(name, str)
        or not isinstance(message, str)
        or not message.strip()
        or len(message) > 3000
        or len(name) > 100
    ):
        return JsonResponse({'error': 'Check the name and message length.'}, status=400)
    Suggestion.objects.create(name=name.strip(), message=message.strip())
    return JsonResponse({'saved': True}, status=201)
