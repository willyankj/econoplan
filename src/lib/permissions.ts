import { UserRole } from "@prisma/client";

// Definição Hierárquica das Permissões
export const PERMISSION_MODULES = [
  {
    key: 'transactions',
    label: 'Transações & Extrato',
    permissions: [
      { key: 'transactions_create', label: 'Criar Lançamento', desc: 'Adicionar receitas ou despesas.' },
      { key: 'transactions_edit', label: 'Editar Lançamento', desc: 'Alterar valores ou descrições.' },
      { key: 'transactions_delete', label: 'Excluir Lançamento', desc: 'Remover registros do extrato.' },
    ]
  },
  {
    key: 'cards',
    label: 'Cartões de Crédito',
    permissions: [
      { key: 'cards_create', label: 'Criar Cartão', desc: 'Cadastrar novos cartões.' },
      { key: 'cards_edit', label: 'Editar Cartão', desc: 'Alterar limite ou dia de fechamento.' },
      { key: 'cards_delete', label: 'Excluir Cartão', desc: 'Remover cartão e seu histórico.' },
      { key: 'cards_pay', label: 'Pagar Fatura', desc: 'Registrar pagamento de faturas.' },
    ]
  },
  {
    key: 'accounts',
    label: 'Contas Bancárias',
    permissions: [
      { key: 'accounts_create', label: 'Criar Conta', desc: 'Adicionar novas contas.' },
      { key: 'accounts_edit', label: 'Editar Conta', desc: 'Alterar nome ou banco.' },
      { key: 'accounts_delete', label: 'Excluir Conta', desc: 'Remover conta e saldo.' },
    ]
  },
  {
    key: 'budgets',
    label: 'Orçamentos (Budgets)',
    permissions: [
      { key: 'budgets_create', label: 'Definir Orçamento', desc: 'Criar novos tetos de gastos.' },
      { key: 'budgets_edit', label: 'Editar Orçamento', desc: 'Alterar valores limite.' },
      { key: 'budgets_delete', label: 'Excluir Orçamento', desc: 'Remover monitoramento.' },
    ]
  },
  {
    key: 'organization',
    label: 'Gestão da Organização',
    permissions: [
      { key: 'org_view', label: 'Ver Painel Geral', desc: 'Acessar a visão consolidada (Tenant).' },
      { key: 'org_invite', label: 'Convidar Membros', desc: 'Adicionar pessoas à equipe/família.' },
      { key: 'org_manage_workspaces', label: 'Gerenciar Workspaces', desc: 'Criar/Excluir áreas de trabalho.' },
    ]
  }
];

// Configuração Padrão (Inicial)
export const DEFAULT_TENANT_SETTINGS = {
  permissions: {
    member: {
      // Transações
      transactions_create: true,
      transactions_edit: true,
      transactions_delete: false, // Padrão: não pode apagar
      // Cartões
      cards_create: false,
      cards_edit: false,
      cards_delete: false,
      cards_pay: true, // Padrão: pode pagar a conta
      // Contas
      accounts_create: false,
      accounts_edit: false,
      accounts_delete: false,
      // Orçamentos
      budgets_create: false,
      budgets_edit: false,
      budgets_delete: false,
      // Org
      org_view: false,
      org_invite: false,
      org_manage_workspaces: false
    },
    admin: {
      // Admin tem tudo true por padrão, mas listamos para garantir
      transactions_create: true, transactions_edit: true, transactions_delete: true,
      cards_create: true, cards_edit: true, cards_delete: true, cards_pay: true,
      accounts_create: true, accounts_edit: true, accounts_delete: true,
      budgets_create: true, budgets_edit: true, budgets_delete: true,
      org_view: true, org_invite: true, org_manage_workspaces: false // Geralmente só Owner cria workspace
    }
  }
};

export function checkPermission(
  userRole: UserRole, 
  settings: any, 
  permissionKey: string
): boolean {
  if (userRole === 'OWNER') return true;

  // Garante que safeSettings seja um objeto
  const safeSettings = settings && typeof settings === 'object' ? settings : DEFAULT_TENANT_SETTINGS;
  
  // Garante que perms seja o do settings OU o padrão, e que não seja null
  const perms = (safeSettings?.permissions) || DEFAULT_TENANT_SETTINGS.permissions;

  // Proteção extra: se perms for null/undefined por algum motivo bizarro do banco
  if (!perms) return false;

  const rolePerms = userRole === 'ADMIN' 
    ? (perms.admin || DEFAULT_TENANT_SETTINGS.permissions.admin)
    : (perms.member || DEFAULT_TENANT_SETTINGS.permissions.member);

  // Se rolePerms ainda for undefined, retorna false
  if (!rolePerms) return false;

  return rolePerms[permissionKey] ?? false;
}