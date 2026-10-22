"""Admin authoring. Appearance is themed by templates/admin/base_site.html and
wiki/static/wiki/admin-theme.css; this module only arranges the screens."""
from django.contrib import admin

from .models import Article, Suggestion

admin.site.site_header = 'Quoderat — The Living Archive'
admin.site.site_title = 'Quoderat'
admin.site.index_title = 'Archive administration'


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'slug', 'updated_at')
    list_display_links = ('title',)
    list_filter = ('category',)
    search_fields = ('title', 'slug', 'body')
    search_help_text = 'Matches the title, the slug, or the article body.'
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'updated_at'
    ordering = ('category', 'title')
    list_per_page = 50
    readonly_fields = ('updated_at',)
    fieldsets = (
        ('Identity', {
            'fields': ('title', 'slug', 'category', 'source'),
            'description': 'Slugs are public URLs: bookmarks point at them, '
                           'so rename one only when you also mean to break links.',
        }),
        ('Content', {
            'fields': ('body', 'translations'),
            'description': 'Markdown source. The frontend renders it with '
                           'GitHub-style tables and never executes raw HTML. '
                           'Translations hold the same keys as the English fields.',
        }),
        ('Attributes', {
            'fields': ('stats',),
            'description': 'Character dossiers only: a JSON object of text values, '
                           'for example {"Held law": "Number"}.',
        }),
        ('History', {
            'fields': ('updated_at',),
            'classes': ('collapse',),
        }),
    )


@admin.register(Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    """The letter inbox: letters are read-only, triage is one checkbox."""

    list_display = ('created_at', 'name', 'excerpt', 'reviewed')
    list_display_links = ('created_at', 'name')
    list_editable = ('reviewed',)
    list_filter = ('reviewed', 'created_at')
    search_fields = ('name', 'message')
    search_help_text = 'Matches the pseudonym or the letter text.'
    date_hierarchy = 'created_at'
    readonly_fields = ('name', 'message', 'created_at')
    actions = ('mark_reviewed', 'mark_unreviewed')
    fieldsets = (
        ('Letter', {
            'fields': ('name', 'message', 'created_at'),
            'description': 'Submitted through the public form. Read-only here.',
        }),
        ('Triage', {'fields': ('reviewed',)}),
    )

    def has_add_permission(self, request):
        return False

    @admin.display(description='Letter')
    def excerpt(self, obj):
        text = ' '.join(obj.message.split())
        return text if len(text) <= 70 else f'{text[:70]}…'

    @admin.action(description='Mark selected letters as reviewed')
    def mark_reviewed(self, request, queryset):
        queryset.update(reviewed=True)

    @admin.action(description='Mark selected letters as unreviewed')
    def mark_unreviewed(self, request, queryset):
        queryset.update(reviewed=False)
