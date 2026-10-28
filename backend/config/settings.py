"""Local defaults; production requires explicit secrets, hosts and HTTPS."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'development-only-do-not-use-in-production')
if not DEBUG and SECRET_KEY == 'development-only-do-not-use-in-production':
    raise RuntimeError('Set DJANGO_SECRET_KEY in production')
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
# Vite forwards local forms to Django on a different port. Trust only the
# explicit development origins; deployments supply their own list.
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'DJANGO_CSRF_TRUSTED_ORIGINS', 'http://127.0.0.1:5980,http://localhost:5980' if DEBUG else ''
    ).split(',')
    if origin.strip()
]
# Suggestion box spam limits. The per-IP window is one hour; the global cap is per day
# and bounds total spam even if an attacker rotates addresses.
SUGGESTION_LIMIT_PER_IP_HOUR = int(os.getenv('SUGGESTION_LIMIT_PER_IP_HOUR', '5'))
SUGGESTION_LIMIT_PER_DAY = int(os.getenv('SUGGESTION_LIMIT_PER_DAY', '200'))
# Behind Nginx every request arrives from 127.0.0.1. Enable this only when the proxy
# overwrites X-Real-IP (proxy_set_header X-Real-IP $remote_addr), or clients can forge it.
TRUST_X_REAL_IP = os.getenv('DJANGO_TRUST_X_REAL_IP', 'false').lower() == 'true'
# Rate-limit counters live in the cache. Local memory is per process, so production
# uses a file cache that every gunicorn worker shares.
CACHES = (
    {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
    if DEBUG
    else {
        'default': {
            'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
            'LOCATION': os.getenv('DJANGO_CACHE_DIR', str(BASE_DIR / '.cache')),
        }
    }
)
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'wiki',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
# Project templates come first so admin/base_site.html can restyle the admin
# without shadowing django.contrib.admin's own templates.
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ]
        },
    }
]
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
WSGI_APPLICATION = 'config.wsgi.application'
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'Asia/Singapore'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
