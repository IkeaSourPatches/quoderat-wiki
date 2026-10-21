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

class SuggestionTests(__import__('django.test', fromlist=['TestCase']).TestCase):
    def test_private_submission_and_validation(self):
        from django.test import Client
        from .models import Suggestion
        client = Client(enforce_csrf_checks=True)
        url = '/api/suggestions/'
        self.assertEqual(client.post(url, {'message': 'Idea'}, content_type='application/json').status_code, 403)
        token = client.get(url).json()['csrfToken']
        self.assertEqual(client.post(url, {'message': '  '}, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, 400)
        self.assertEqual(client.post(url, {'message': 'A test idea'}, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, 201)
        self.assertEqual(Suggestion.objects.count(), 1)
        self.assertNotIn('A test idea', client.get(url).content.decode())


class ProxyCsrfTests(TestCase):
    def test_local_frontend_origin_and_untrusted_origin(self):
        from django.test import Client
        client = Client(enforce_csrf_checks=True)
        token = client.get('/api/suggestions/').json()['csrfToken']
        for origin in ['http://127.0.0.1:5980', 'http://localhost:5980']:
            response = client.post('/api/suggestions/', {'message': 'Proxy check'},
                content_type='application/json', HTTP_X_CSRFTOKEN=token,
                HTTP_ORIGIN=origin)
            self.assertEqual(response.status_code, 201)
        response = client.post('/api/suggestions/', {'message': 'Rejected'},
            content_type='application/json', HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN='https://untrusted.example')
        self.assertEqual(response.status_code, 403)
