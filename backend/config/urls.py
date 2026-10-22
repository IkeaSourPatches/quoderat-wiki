from wiki import game
from django.contrib import admin
from django.urls import path
from wiki.views import articles, article_detail, suggestions
urlpatterns = [path('api/game/puzzles/',game.puzzles),path('api/game/daily/',game.daily),path('api/game/validate/',game.validate),path('api/suggestions/',suggestions),path('admin/',admin.site.urls),path('api/articles/',articles),path('api/articles/<slug:slug>/',article_detail)]
