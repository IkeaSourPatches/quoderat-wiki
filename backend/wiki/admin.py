from django.contrib import admin
from .models import Article
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title','category','updated_at')
    list_filter = ('category',)
    search_fields = ('title','body')
    prepopulated_fields = {'slug':('title',)}
