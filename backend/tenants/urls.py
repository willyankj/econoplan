from rest_framework_nested import routers
from .views import (
    TenantViewSet, WorkspaceViewSet, CategoryViewSet, GoalViewSet, TransactionViewSet
)

# Cria um roteador principal para os Tenants
router = routers.DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')

# Cria um roteador aninhado para os Workspaces dentro dos Tenants
# O lookup 'tenant' será usado para encontrar o tenant específico na URL,
# ex: /tenants/<tenant_pk>/workspaces/
workspaces_router = routers.NestedSimpleRouter(router, r'tenants', lookup='tenant')
workspaces_router.register(r'workspaces', WorkspaceViewSet, basename='tenant-workspaces')

# Cria roteadores aninhados para os filhos de Workspaces
categories_router = routers.NestedSimpleRouter(workspaces_router, r'workspaces', lookup='workspace')
categories_router.register(r'categories', CategoryViewSet, basename='workspace-categories')

goals_router = routers.NestedSimpleRouter(workspaces_router, r'workspaces', lookup='workspace')
goals_router.register(r'goals', GoalViewSet, basename='workspace-goals')

transactions_router = routers.NestedSimpleRouter(workspaces_router, r'workspaces', lookup='workspace')
transactions_router.register(r'transactions', TransactionViewSet, basename='workspace-transactions')


# As urlpatterns combinam todas as rotas
urlpatterns = (
    router.urls +
    workspaces_router.urls +
    categories_router.urls +
    goals_router.urls +
    transactions_router.urls
)
