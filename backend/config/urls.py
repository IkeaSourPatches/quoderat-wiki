from django.contrib import admin
from django.urls import path
from wiki.views import articles, article_detail
urlpatterns = [path('admin/',admin.site.urls),path('api/articles/',articles),path('api/articles/<slug:slug>/',article_detail)]
