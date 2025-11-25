'use server';

// Imports diretos de cada arquivo (sem export * para evitar confusão do Next.js com server actions)
import {
  switchWorkspace as _switchWorkspace,
  createWorkspace as _createWorkspace,
  updateWorkspaceName as _updateWorkspaceName,
  deleteWorkspace as _deleteWorkspace,
  inviteMember as _inviteMember,
  removeMember as _removeMember,
  updateMemberRole as _updateMemberRole,
  toggleWorkspaceAccess as _toggleWorkspaceAccess,
  updateTenantName as _updateTenantName,
  updateTenantSettings as _updateTenantSettings
} from './actions/workspaces';

import {
  upsertAccount as _upsertAccount,
  deleteAccount as _deleteAccount,
  upsertCard as _upsertCard,
  deleteCreditCard as _deleteCreditCard,
  payCreditCardInvoice as _payCreditCardInvoice,
  upsertTransaction as _upsertTransaction,
  deleteTransaction as _deleteTransaction,
  importTransactions as _importTransactions
} from './actions/finance';

import {
  upsertBudget as _upsertBudget,
  deleteBudget as _deleteBudget,
  upsertGoal as _upsertGoal,
  deleteGoal as _deleteGoal,
  moveMoneyGoal as _moveMoneyGoal,
  getNotifications as _getNotifications,
  markNotificationAsRead as _markNotificationAsRead,
  markAllNotificationsAsRead as _markAllNotificationsAsRead,
  checkDeadlinesAndSendAlerts as _checkDeadlinesAndSendAlerts
} from './actions/planning';

// =================================================
// EXPORTS UNIFICADOS (Com nomes originais)
// =================================================

// Workspaces
export const switchWorkspace = _switchWorkspace;
export const createWorkspace = _createWorkspace;
export const updateWorkspaceName = _updateWorkspaceName;
export const deleteWorkspace = _deleteWorkspace;
export const inviteMember = _inviteMember;
export const removeMember = _removeMember;
export const updateMemberRole = _updateMemberRole;
export const toggleWorkspaceAccess = _toggleWorkspaceAccess;
export const updateTenantName = _updateTenantName;
export const updateTenantSettings = _updateTenantSettings;

// Finance
export const upsertAccount = _upsertAccount;
export const deleteAccount = _deleteAccount;
export const upsertCard = _upsertCard;
export const deleteCreditCard = _deleteCreditCard;
export const payCreditCardInvoice = _payCreditCardInvoice;
export const upsertTransaction = _upsertTransaction;
export const deleteTransaction = _deleteTransaction;
export const importTransactions = _importTransactions;

// Planning & System
export const upsertBudget = _upsertBudget;
export const deleteBudget = _deleteBudget;
export const upsertGoal = _upsertGoal;
export const deleteGoal = _deleteGoal;
export const getNotifications = _getNotifications;
export const markNotificationAsRead = _markNotificationAsRead;
export const markAllNotificationsAsRead = _markAllNotificationsAsRead;
export const checkDeadlinesAndSendAlerts = _checkDeadlinesAndSendAlerts;

// =================================================
// ALIASES PARA COMPATIBILIDADE (Backwards Compatibility)
// =================================================

export const createAccount = async (data: FormData) => _upsertAccount(data);
export const updateAccount = async (id: string, data: FormData) => _upsertAccount(data, id);

export const createCreditCard = async (data: FormData) => _upsertCard(data);
export const updateCreditCard = async (id: string, data: FormData) => _upsertCard(data, id);
export const payInvoice = async (data: FormData) => _payCreditCardInvoice(data);

export const createTransaction = async (data: FormData) => _upsertTransaction(data);
export const updateTransaction = async (id: string, data: FormData) => _upsertTransaction(data, id);

export const createBudget = async (data: FormData) => _upsertBudget(data);
export const updateBudget = async (id: string, data: FormData) => _upsertBudget(data, id);

export const createGoal = async (data: FormData) => _upsertGoal(data);
export const updateGoal = async (id: string, data: FormData) => _upsertGoal(data, id);
export const createSharedGoal = async (data: FormData) => _upsertGoal(data, undefined, true);

export const addMoneyToGoal = async (id: string, amount: number, accId: string) => _moveMoneyGoal(id, amount, accId, 'DEPOSIT');
export const withdrawMoneyFromGoal = async (id: string, amount: number, accId: string) => _moveMoneyGoal(id, amount, accId, 'WITHDRAW');