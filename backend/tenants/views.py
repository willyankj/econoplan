from rest_framework import viewsets, permissions
from .models import Tenant, Workspace, WorkspaceMembership
from .serializers import TenantSerializer, WorkspaceSerializer

class TenantViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows tenants to be viewed or edited.
    """
    serializer_class = TenantSerializer
    # Garante que apenas usuários autenticados possam interagir com os tenants.
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Este viewset deve retornar uma lista de todos os tenants
        para o usuário autenticado atualmente.
        """
        user = self.request.user
        return Tenant.objects.filter(members=user)

    def perform_create(self, serializer):
        """
        Define o usuário logado como o 'owner' do novo tenant e o adiciona
        à lista de 'members'.
        """
        tenant = serializer.save(owner=self.request.user)
        # Adiciona o 'owner' como um 'member' automaticamente.
        tenant.members.add(self.request.user)


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows workspaces to be viewed or edited.
    """
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Este viewset deve retornar uma lista de todos os workspaces para o
        tenant especificado na URL, mas apenas se o usuário for membro
        desse workspace.
        """
        # tenant_pk é o nome do parâmetro que definiremos na URL aninhada.
        tenant_pk = self.kwargs['tenant_pk']
        user = self.request.user

        # Filtra workspaces que pertencem ao tenant da URL e nos quais o
        # usuário é membro.
        return Workspace.objects.filter(tenant_id=tenant_pk, members=user)

    def perform_create(self, serializer):
        """
        Cria um novo workspace e adiciona o usuário logado como o primeiro
        membro com a função de 'admin'.
        """
        tenant_pk = self.kwargs['tenant_pk']
        # Garante que o tenant existe e que o usuário tem permissão para
        # acessá-lo (baseado no queryset do TenantViewSet).
        try:
            tenant = Tenant.objects.get(pk=tenant_pk, members=self.request.user)
        except Tenant.DoesNotExist:
            raise permissions.PermissionDenied("Você não tem permissão para criar um workspace neste tenant.")

        workspace = serializer.save(tenant=tenant)
        # Cria a membresia para o usuário criador com a função 'admin'.
        WorkspaceMembership.objects.create(
            user=self.request.user,
            workspace=workspace,
            role='admin'
        )
