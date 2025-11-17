from rest_framework import serializers
from users.serializers import CustomUserDetailsSerializer
from .models import Tenant, Workspace, WorkspaceMembership

class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo de membresia do Workspace.

    Aninha os detalhes do usuário para fornecer mais contexto no frontend.
    """
    user = CustomUserDetailsSerializer(read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ['user', 'role']


class WorkspaceSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo Workspace.

    Aninha os detalhes dos membros do workspace.
    """
    # O source='workspacemembership_set' busca os objetos de membresia
    # relacionados a este workspace para que possam ser serializados pelo
    # WorkspaceMembershipSerializer.
    members = WorkspaceMembershipSerializer(
        source='workspacemembership_set',
        many=True,
        read_only=True
    )

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'members']


class TenantSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo Tenant.

    Aninha os workspaces que pertencem a este tenant.
    """
    workspaces = WorkspaceSerializer(many=True, read_only=True)
    # O campo 'owner' será somente leitura, pois será definido
    # automaticamente na view com base no usuário logado.
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Tenant
        fields = ['id', 'name', 'owner', 'workspaces']
