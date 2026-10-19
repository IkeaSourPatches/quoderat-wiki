from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from .models import Article
FIELDS = ('slug','title','category','body','source','stats')
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
