import uuid
from django.db import models
from django.conf import settings

# O Tenant é a "Conta" principal (Ex: a "Casa")
# É aqui que a assinatura do Mercado Pago será vinculada.
class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    # O 'dono' do tenant (quem paga a conta)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_tenant'
    )
    # O 'User' pode ser membro de vários tenants, mas só é 'dono' de um.
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='tenants'
    )

    # Futuros campos:
    # subscription_status = models.CharField(max_length=50, default='free')
    # mercado_pago_id = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name

# Workspace é a área de trabalho (Ex: "Viagem de Fim de Ano")
class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='workspaces')
    # Usuários que têm acesso a este workspace específico
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='WorkspaceMembership', # Modelo de junção
        related_name='workspaces'
    )

    def __str__(self):
        return f"{self.tenant.name} - {self.name}"

# Modelo de Junção (Membership) para Workspaces
# Define quem está no workspace e qual seu papel
class WorkspaceMembership(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('guest', 'Guest'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')

    class Meta:
        unique_together = ('user', 'workspace') # Usuário só pode estar uma vez no workspace

    def __str__(self):
        return f"{self.user.email} in {self.workspace.name} ({self.role})"
