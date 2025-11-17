from rest_framework import serializers
from users.serializers import CustomUserDetailsSerializer
from .models import Tenant, Workspace, WorkspaceMembership, Category, Goal, Transaction

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


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for the Category model."""
    class Meta:
        model = Category
        fields = ['id', 'name', 'workspace']
        read_only_fields = ['workspace']


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for the Goal model."""
    class Meta:
        model = Goal
        fields = ['id', 'name', 'workspace', 'target_amount', 'current_amount']
        read_only_fields = ['workspace']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for the Transaction model."""
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'workspace', 'category', 'user', 'goal', 'amount', 'type',
            'date', 'description'
        ]
        read_only_fields = ['workspace']
