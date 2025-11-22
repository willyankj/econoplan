import { UserRole } from "@prisma/client";

// Lista Mestra de Permissões
export const PERMISSION_DEFINITIONS = [
  { key: 'canCreateCards', label: 'Criar Cartões e Contas', description: 'Permite cadastrar novas fontes de dinheiro.' },
  { key: 'canDeleteTransactions', label: 'Excluir Transações', description: 'Permite apagar registros do extrato.' },
  { key: 'canManageBudgets', label: 'Gerenciar Orçamentos', description: 'Criar, alterar ou excluir tetos de gastos.' },
  { key: 'canInviteGuests', label: 'Convidar Membros', description: 'Adicionar novas pessoas à organização.' },
  { key: 'canManageWorkspaces', label: 'Gerenciar Workspaces', description: 'Criar ou editar áreas de trabalho.' },
  // NOVA PERMISSÃO:
  { key: 'canViewOrganization', label: 'Ver Painel da Organização', description: 'Acessar a visão geral e metas globais da empresa/família.' },
];

export const DEFAULT_TENANT_SETTINGS = {
  permissions: {
    member: {
      canCreateCards: false,
      canDeleteTransactions: false,
      canManageBudgets: false,
      canInviteGuests: false,
      canManageWorkspaces: false,
      canViewOrganization: false // Membros NÃO veem por padrão
    },
    admin: {
      canCreateCards: true,
      canDeleteTransactions: true,
      canManageBudgets: true,
      canInviteGuests: true,
      canManageWorkspaces: false,
      canViewOrganization: true // Admins VEEM por padrão (mas pode ser removido)
    }
  }
};

export type TenantSettings = typeof DEFAULT_TENANT_SETTINGS;

export function checkPermission(
  userRole: UserRole, 
  settings: any, 
  action: string
): boolean {
  if (userRole === 'OWNER') return true; // Dono faz tudo

  const currentSettings = (settings || DEFAULT_TENANT_SETTINGS) as TenantSettings;

  if (userRole === 'ADMIN') {
    // @ts-ignore
    return currentSettings.permissions.admin[action] ?? true;
  }

  if (userRole === 'MEMBER') {
    // @ts-ignore
    return currentSettings.permissions.member[action] ?? false;
  }

  return false;
}