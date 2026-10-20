from django.test import TestCase
from django.core.management import call_command
from .models import Article
class ArchiveTests(TestCase):
    def setUp(self):
        Article.objects.create(slug='test',title='Test',category='Characters',body='**Markdown**',stats={'Held law':'Number'})
    def test_api_contract_and_read_only(self):
        result=self.client.get('/api/articles/')
        self.assertEqual(result.status_code,200)
        self.assertEqual(result.json()[0]['stats'],{'Held law':'Number'})
        self.assertEqual(self.client.post('/api/articles/',{}).status_code,405)
        self.assertEqual(self.client.get('/api/articles/missing/').status_code,404)
    def test_seed_is_repeatable_and_preserves_edits(self):
        call_command('seed_wiki')
        row=Article.objects.get(slug='ilar-hesabu');row.body='An authored revision';row.save()
        count=Article.objects.count();call_command('seed_wiki')
        self.assertEqual(Article.objects.count(),count)
        self.assertEqual(Article.objects.get(slug='ilar-hesabu').body,'An authored revision')
    def test_admin_requires_login(self):
        self.assertEqual(self.client.get('/admin/wiki/article/').status_code,302)
    def test_bilingual_seed_and_api_keep_one_identity(self):
        call_command('seed_wiki')
        result=self.client.get('/api/articles/timeline/').json()
        self.assertEqual(result['slug'],'timeline')
        self.assertIn('Floor 0: Creation',result['body'])
        self.assertIn('第零层：创世',result['translations']['zh']['body'])
        self.assertNotIn('第零层',result['body'])
        self.assertEqual(result['translations']['zh']['title'],'历史之塔')
