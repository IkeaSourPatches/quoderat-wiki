from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings

from .models import Article


class ArchiveTests(TestCase):
    def setUp(self):
        Article.objects.create(
            slug='test', title='Test', category='Characters', body='**Markdown**', stats={'Held law': 'Number'}
        )

    def test_api_contract_and_read_only(self):
        result = self.client.get('/api/articles/')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()[0]['stats'], {'Held law': 'Number'})
        self.assertEqual(self.client.post('/api/articles/', {}).status_code, 405)
        self.assertEqual(self.client.get('/api/articles/missing/').status_code, 404)

    def test_seed_is_repeatable_and_preserves_edits(self):
        call_command('seed_wiki')
        row = Article.objects.get(slug='ilar-hesabu')
        row.body = 'An authored revision'
        row.save()
        count = Article.objects.count()
        call_command('seed_wiki')
        self.assertEqual(Article.objects.count(), count)
        self.assertEqual(Article.objects.get(slug='ilar-hesabu').body, 'An authored revision')

    def test_admin_requires_login(self):
        self.assertEqual(self.client.get('/admin/wiki/article/').status_code, 302)

    def test_bilingual_seed_and_api_keep_one_identity(self):
        call_command('seed_wiki')
        result = self.client.get('/api/articles/timeline/').json()
        self.assertEqual(result['slug'], 'timeline')
        self.assertIn('Floor 0: Creation', result['body'])
        self.assertIn('第零层：创世', result['translations']['zh']['body'])
        self.assertNotIn('第零层', result['body'])
        self.assertEqual(result['translations']['zh']['title'], '历史之塔')


class SuggestionTests(__import__('django.test', fromlist=['TestCase']).TestCase):
    def setUp(self):
        __import__('django.core.cache', fromlist=['cache']).cache.clear()

    def test_private_submission_and_validation(self):
        from django.test import Client

        from .models import Suggestion

        client = Client(enforce_csrf_checks=True)
        url = '/api/suggestions/'
        self.assertEqual(client.post(url, {'message': 'Idea'}, content_type='application/json').status_code, 403)
        token = client.get(url).json()['csrfToken']
        self.assertEqual(
            client.post(url, {'message': '  '}, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code,
            400,
        )
        self.assertEqual(
            client.post(
                url, {'message': 'A test idea'}, content_type='application/json', HTTP_X_CSRFTOKEN=token
            ).status_code,
            201,
        )
        self.assertEqual(Suggestion.objects.count(), 1)
        self.assertNotIn('A test idea', client.get(url).content.decode())


class ProxyCsrfTests(TestCase):
    def setUp(self):
        __import__('django.core.cache', fromlist=['cache']).cache.clear()

    def test_local_frontend_origin_and_untrusted_origin(self):
        from django.test import Client

        client = Client(enforce_csrf_checks=True)
        token = client.get('/api/suggestions/').json()['csrfToken']
        for origin in ['http://127.0.0.1:5980', 'http://localhost:5980']:
            response = client.post(
                '/api/suggestions/',
                {'message': 'Proxy check'},
                content_type='application/json',
                HTTP_X_CSRFTOKEN=token,
                HTTP_ORIGIN=origin,
            )
            self.assertEqual(response.status_code, 201)
        response = client.post(
            '/api/suggestions/',
            {'message': 'Rejected'},
            content_type='application/json',
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN='https://untrusted.example',
        )
        self.assertEqual(response.status_code, 403)


@override_settings(SUGGESTION_LIMIT_PER_IP_HOUR=2, SUGGESTION_LIMIT_PER_DAY=3)
class SuggestionRateLimitTests(TestCase):
    url = '/api/suggestions/'

    def setUp(self):
        cache.clear()

    def post(self, ip, **extra):
        return self.client.post(self.url, {'message': 'Idea'}, content_type='application/json', REMOTE_ADDR=ip, **extra)

    def test_per_ip_limit_returns_429_with_retry_after(self):
        from .models import Suggestion

        self.assertEqual(self.post('1.1.1.1').status_code, 201)
        self.assertEqual(self.post('1.1.1.1').status_code, 201)
        response = self.post('1.1.1.1')
        self.assertEqual(response.status_code, 429)
        self.assertTrue(response.has_header('Retry-After'))
        self.assertEqual(Suggestion.objects.count(), 2)
        # A different visitor is unaffected by the first visitor's limit.
        self.assertEqual(self.post('2.2.2.2').status_code, 201)

    def test_invalid_floods_count_toward_the_limit(self):
        for _ in range(2):
            self.client.post(self.url, {'message': ' '}, content_type='application/json', REMOTE_ADDR='1.1.1.1')
        self.assertEqual(self.post('1.1.1.1').status_code, 429)

    def test_global_daily_cap_survives_rotating_addresses(self):
        for ip in ('1.0.0.1', '1.0.0.2', '1.0.0.3'):
            self.assertEqual(self.post(ip).status_code, 201)
        self.assertEqual(self.post('1.0.0.4').status_code, 429)

    def test_x_real_ip_is_ignored_unless_trusted(self):
        # Untrusted: a forged header cannot dodge the limit for the real address.
        for _ in range(2):
            self.post('127.0.0.1', HTTP_X_REAL_IP='9.9.9.9')
        self.assertEqual(self.post('127.0.0.1', HTTP_X_REAL_IP='8.8.8.8').status_code, 429)

    @override_settings(TRUST_X_REAL_IP=True)
    def test_trusted_proxy_limits_each_visitor_separately(self):
        for _ in range(2):
            self.post('127.0.0.1', HTTP_X_REAL_IP='9.9.9.9')
        self.assertEqual(self.post('127.0.0.1', HTTP_X_REAL_IP='9.9.9.9').status_code, 429)
        self.assertEqual(self.post('127.0.0.1', HTTP_X_REAL_IP='8.8.8.8').status_code, 201)
