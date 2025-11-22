import { UserRole } from "@prisma/client";

// Lista Mestra de Permissões (Adicione novas aqui)
export const PERMISSION_DEFINITIONS = [
  { key: 'canCreateCards', label: 'Criar Cartões e Contas', description: 'Permite cadastrar novas fontes de dinheiro.' },
  { key: 'canDeleteTransactions', label: 'Excluir Transações', description: 'Permite apagar registros do extrato.' },
  { key: 'canManageBudgets', label: 'Gerenciar Orçamentos', description: 'Criar, alterar ou excluir tetos de gastos.' },
  { key: 'canInviteGuests', label: 'Convidar Membros', description: 'Adicionar novas pessoas à organização.' },
  { key: 'canManageWorkspaces', label: 'Gerenciar Workspaces', description: 'Criar ou editar áreas de trabalho.' },
];

export const DEFAULT_TENANT_SETTINGS = {
  permissions: {
    member: {
      canCreateCards: false,
      canDeleteTransactions: false,
      canManageBudgets: false,
      canInviteGuests: false,
      canManageWorkspaces: false
    },
    admin: {
      canCreateCards: true,
      canDeleteTransactions: true,
      canManageBudgets: true,
      canInviteGuests: true,
      canManageWorkspaces: false // Por padrão Admin não cria workspace, só Owner
    }
  }
};

export type TenantSettings = typeof DEFAULT_TENANT_SETTINGS;

export function checkPermission(
  userRole: UserRole, 
  settings: any, 
  action: string // Agora aceita string dinâmica
): boolean {
  if (userRole === 'OWNER') return true;

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