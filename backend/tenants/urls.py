from rest_framework_nested import routers
from .views import TenantViewSet, WorkspaceViewSet

# Cria um roteador principal para os Tenants
router = routers.DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')

# Cria um roteador aninhado para os Workspaces dentro dos Tenants
# O lookup 'tenant' será usado para encontrar o tenant específico na URL,
# ex: /tenants/<tenant_pk>/workspaces/
workspaces_router = routers.NestedSimpleRouter(router, r'tenants', lookup='tenant')
workspaces_router.register(r'workspaces', WorkspaceViewSet, basename='tenant-workspaces')

# As urlpatterns combinam as rotas do roteador principal e do aninhado
urlpatterns = router.urls + workspaces_router.urls
