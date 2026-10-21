from django.db import models
class Article(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=80)
    body = models.TextField(help_text='Markdown source. Raw HTML is not rendered by the frontend.')
    source = models.CharField(max_length=255, blank=True)
    stats = models.JSONField(default=dict, blank=True, help_text='Character attributes as a JSON object of text values.')
    translations = models.JSONField(default=dict, blank=True, help_text="Localized content keyed by language, e.g. zh with title, body and stats.")
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['category','title']
    def __str__(self):
        return self.title
    def clean(self):
        from django.core.exceptions import ValidationError
        if not isinstance(self.stats,dict) or any(not isinstance(v,str) for v in self.stats.values()):
            raise ValidationError({'stats':'Use an object with text values, such as {"Held law": "Number"}.'})

class Suggestion(models.Model):
    name = models.CharField(max_length=100, blank=True)
    message = models.TextField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message[:80]
