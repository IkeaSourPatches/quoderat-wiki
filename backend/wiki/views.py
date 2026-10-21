from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from .models import Article
FIELDS = ('slug','title','category','body','source','stats','translations')
@require_GET
def articles(request):
    rows = Article.objects.all()
    if request.GET.get('category'):
        rows = rows.filter(category=request.GET['category'])
    return JsonResponse(list(rows.values(*FIELDS)),safe=False)
@require_GET
def article_detail(request,slug):
    row=get_object_or_404(Article,slug=slug)
    return JsonResponse({field:getattr(row,field) for field in FIELDS})

# GET issues a CSRF token; POST accepts feedback without exposing other submissions.
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
import json
from .models import Suggestion

@require_http_methods(['GET', 'POST'])
def suggestions(request):
    if request.method == 'GET':
        return JsonResponse({'csrfToken': get_token(request)})
    if len(request.body) > 20000:
        return JsonResponse({'error': 'Message too large.'}, status=400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid message.'}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({'error': 'Invalid message.'}, status=400)
    name, message = data.get('name', ''), data.get('message', '')
    if not isinstance(name, str) or not isinstance(message, str) or not message.strip() or len(message) > 3000 or len(name) > 100:
        return JsonResponse({'error': 'Check the name and message length.'}, status=400)
    Suggestion.objects.create(name=name.strip(), message=message.strip())
    return JsonResponse({'saved': True}, status=201)
