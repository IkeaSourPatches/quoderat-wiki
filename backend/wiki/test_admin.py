from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase

from .models import Article, Suggestion


class AdminWorkspaceTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_superuser('test-editor', password='test-only')
        self.article = Article.objects.create(
            slug='test-profile',
            title='Example character',
            category='Characters',
            body='A sample biography for layout testing.',
        )
        self.letter = Suggestion.objects.create(
            name='Example visitor', message='Could we learn more about the dragon elders?'
        )
        self.client.force_login(self.owner)

    def test_dashboard_and_editor_render_with_theme_last(self):
        for url in [
            '/admin/',
            '/admin/wiki/article/',
            f'/admin/wiki/article/{self.article.pk}/change/',
            '/admin/wiki/suggestion/',
        ]:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            html = response.content.decode()
            self.assertGreater(html.index('wiki/admin-theme.css'), html.index('admin/css/responsive.css'))
            # Optional static fixtures for visual review; only this temporary test DB is rendered.
            import os

            if os.environ.get('ADMIN_REVIEW_DIR'):
                from pathlib import Path

                target = Path(os.environ['ADMIN_REVIEW_DIR'])
                target.mkdir(parents=True, exist_ok=True)
                name = (
                    'dashboard'
                    if url == '/admin/'
                    else 'editor'
                    if '/change/' in url
                    else 'letters'
                    if 'suggestion' in url
                    else 'articles'
                )
                (target / f'{name}.html').write_text(html.replace('"/static/', '"http://127.0.0.1:5980/static/'))
        self.assertContains(self.client.get('/admin/'), 'Keep the world in order.')

    def test_letters_are_read_only_but_can_be_reviewed(self):
        self.assertEqual(self.client.get('/admin/wiki/suggestion/add/').status_code, 403)
        self.client.post(
            f'/admin/wiki/suggestion/{self.letter.pk}/change/',
            {'reviewed': 'on', 'name': 'changed', 'message': 'changed', '_save': 'Save'},
        )
        self.letter.refresh_from_db()
        self.assertTrue(self.letter.reviewed)
        self.assertEqual(self.letter.name, 'Example visitor')
        self.assertEqual(self.letter.message, 'Could we learn more about the dragon elders?')

    def test_dashboard_respects_permissions(self):
        staff = get_user_model().objects.create_user('limited-editor', is_staff=True)
        staff.user_permissions.add(Permission.objects.get(codename='view_article'))
        self.client.force_login(staff)
        response = self.client.get('/admin/')
        self.assertContains(response, '/admin/wiki/article/')
        self.assertNotContains(response, '/admin/wiki/suggestion/')
        self.assertNotContains(response, '/admin/auth/user/')
        self.assertNotContains(response, '/admin/wiki/article/add/')
