import json
from pathlib import Path
from django.core.management.base import BaseCommand
from wiki.models import Article
class Command(BaseCommand):
    help = 'Import missing articles; preserve existing edits. --replace explicitly restores source data.'
    def add_arguments(self,parser):
        parser.add_argument('--replace',action='store_true')
    def handle(self,*args,**options):
        data = Path(__file__).resolve().parents[4]/'data'/'articles.json'
        for row in json.loads(data.read_text()):
            slug=row.pop('slug')
            method=Article.objects.update_or_create if options['replace'] else Article.objects.get_or_create
            method(slug=slug,defaults=row)
        self.stdout.write(self.style.SUCCESS(f'Archive ready: {Article.objects.count()} entries'))
