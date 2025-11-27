'use server';

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
  importTransactions as _importTransactions,
  stopTransactionRecurrence as _stopTransactionRecurrence,
  getRecurringTransactions as _getRecurringTransactions
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

import {
    upsertCategory as _upsertCategory,
    deleteCategory as _deleteCategory
} from './actions/categories';

// =================================================
// EXPORTS UNIFICADOS
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
export const stopTransactionRecurrence = _stopTransactionRecurrence;
export const getRecurringTransactions = _getRecurringTransactions;

// Categories
export const upsertCategory = _upsertCategory;
export const deleteCategory = _deleteCategory;

// Planning & System
export const upsertBudget = _upsertBudget;
export const deleteBudget = _deleteBudget;
export const upsertGoal = _upsertGoal;
export const deleteGoal = _deleteGoal;
// Helper para movimentação de meta (add/withdraw)
export const addMoneyToGoal = async (id: string, amount: number, accId: string) => _moveMoneyGoal(id, amount, accId, 'DEPOSIT');
export const withdrawMoneyFromGoal = async (id: string, amount: number, accId: string) => _moveMoneyGoal(id, amount, accId, 'WITHDRAW');

export const getNotifications = _getNotifications;
export const markNotificationAsRead = _markNotificationAsRead;
export const markAllNotificationsAsRead = _markAllNotificationsAsRead;
export const checkDeadlinesAndSendAlerts = _checkDeadlinesAndSendAlerts;