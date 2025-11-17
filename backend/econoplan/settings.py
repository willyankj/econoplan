import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/stable/howto/deployment/checklist/

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-fallback-key-for-development')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = []

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # Third-party apps
    'rest_framework',
    'corsheaders',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'rest_framework_simplejwt',

    # Local apps
    'users.apps.UsersConfig',
    'tenants.apps.TenantsConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'econoplan.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'econoplan.wsgi.application'

# Database
# https://docs.djangoproject.com/en/stable/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB'),
        'USER': os.environ.get('POSTGRES_USER'),
        'HOST': os.environ.get('POSTGRES_HOST'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
        'PORT': 5432,
    }
}

# Password validation
# https://docs.djangoproject.com/en/stable/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

# Internationalization
# https://docs.djangoproject.com/en/stable/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/stable/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/stable/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Custom Settings for EconoPlan ---

AUTH_USER_MODEL = 'users.CustomUser'

# 1. Configuração do django.contrib.sites (obrigatório pelo allauth)
SITE_ID = 1

# 2. Configurações do Allauth
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend', # Login padrão do admin
    'allauth.account.auth_backends.AuthenticationBackend', # Login do allauth
]

ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'optional'

# 3. Configurações do dj-rest-auth (para emitir JWT)
REST_USE_JWT = True
JWT_AUTH_COOKIE = 'econoplan-auth-cookie'
JWT_AUTH_REFRESH_COOKIE = 'econoplan-refresh-cookie'

# 4. Configurar o dj-rest-auth para usar os Serializers de UUID
REST_AUTH_SERIALIZERS = {
    'USER_DETAILS_SERIALIZER': 'users.serializers.CustomUserDetailsSerializer',
}

# 5. Configuração do REST Framework e SimpleJWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

# 6. Configuração para Provedores Sociais (Ex: Google)
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        # O 'key' e 'secret' são as credenciais do App OAuth do Google
        # Preencha-as com as chaves do seu projeto no Google Cloud Console
        'APP': {
            'client_id': 'SEU_CLIENT_ID_DO_GOOGLE_AQUI',
            'secret': 'SEU_SECRET_DO_GOOGLE_AQUI',
        },
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        }
    }
}
