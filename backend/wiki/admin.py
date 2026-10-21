from django.contrib import admin
from .models import Article
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title','category','updated_at')
    list_filter = ('category',)
    search_fields = ('title','body')
    prepopulated_fields = {'slug':('title',)}

from .models import Suggestion
@admin.register(Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'reviewed', 'message')
    list_filter = ('reviewed',)
    search_fields = ('name', 'message')
    readonly_fields = ('created_at',)
