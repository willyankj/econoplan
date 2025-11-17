from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Rotas de Autenticação (Registro, Login, Logout, Social)
    # O dj-rest-auth fornece todos os endpoints:
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),

    # Nossas futuras rotas de API (ex: /api/tenants/, /api/workspaces/)
    # path('api/', include('tenants.urls')),
]
