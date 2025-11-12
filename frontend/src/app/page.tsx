'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import AuthGuard from '@/components/AuthGuard';
import CategoryManager from '@/components/CategoryManager';
import AccountManager from '@/components/AccountManager';
import EditTransactionModal, { Transaction } from '@/components/EditTransactionModal';
import TransferForm from '@/components/TransferForm';

// A better solution would be a shared types file.
interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category_id?: string | null;
  transfer_id?: string | null;
  account_name: string;
  from_account?: string;
  to_account?: string;
}

interface Category {
  category_id: string;
  category_name: string;
}

interface Account {
  account_id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState<string | ''>('');
  const [accountId, setAccountId] = useState<string | ''>('');
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeForm, setActiveForm] = useState<'transaction' | 'transfer'>('transaction');

  const processedTransactions = useMemo(() => {
    const transferMap = new Map<string, Transaction[]>();
    const regularTransactions: Transaction[] = [];

    transactions.forEach(t => {
      if (t.type === 'transfer' && t.transfer_id) {
        if (!transferMap.has(t.transfer_id)) {
          transferMap.set(t.transfer_id, []);
        }
        transferMap.get(t.transfer_id)!.push(t);
      } else {
        regularTransactions.push(t);
      }
    });

    const transfers: Transaction[] = [];
    for (const [transferId, group] of transferMap.entries()) {
      if (group.length === 2) {
        const from = group.find(t => t.amount < 0)!;
        const to = group.find(t => t.amount > 0)!;
        transfers.push({
          ...from, // a transaction_id to use as key
          transaction_id: transferId,
          description: from.description,
          amount: Math.abs(from.amount),
          type: 'transfer',
          from_account: from.account_name,
          to_account: to.account_name,
        });
      }
    }

    return [...regularTransactions, ...transfers].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('workspaceId');
    router.push('/login');
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (window.confirm('Você tem certeza que deseja excluir esta transação?')) {
      try {
        await api.delete(`/transactions/${transactionId}`);
        fetchData(); // Refetch all data
      } catch (error) {
        console.error('Falha ao excluir a transação', error);
      }
    }
  };

  const handleOpenModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(false);
  };

  const fetchData = async () => {
    const id = localStorage.getItem('workspaceId');
    if (!id) return;
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const timestamp = new Date().getTime(); // Cache-busting parameter

    try {
      const [transactionsRes, categoriesRes, summaryRes, accountsRes] = await Promise.all([
        api.get(`/transactions?workspaceId=${id}&_=${timestamp}`),
        api.get(`/categories?workspaceId=${id}&_=${timestamp}`),
        api.get(`/dashboard/summary?workspaceId=${id}&month=${month}&year=${year}&_=${timestamp}`),
        api.get(`/accounts?workspaceId=${id}&_=${timestamp}`)
      ]);
      setTransactions(transactionsRes.data);
      setCategories(categoriesRes.data);
      setSummary(summaryRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Falha ao buscar dados', error);
    }
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    fetchData(); // Refetch all data
  };

  useEffect(() => {
    const id = localStorage.getItem('workspaceId');
    setWorkspaceId(id);
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    try {
      const newTransaction = {
        workspace_id: workspaceId,
        account_id: accountId,
        description,
        amount: parseFloat(amount),
        type,
        category_id: categoryId || null,
        transaction_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      };
      await api.post('/transactions', newTransaction);
      fetchData(); // Refetch all data
      // Clear form
      setDescription('');
      setAmount('');
      setAccountId('');
    } catch (error) {
      console.error('Failed to create transaction', error);
    }
  };

  return (
    <AuthGuard>
      <main className="container mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Painel</h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Sair
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div className="bg-green-100 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-green-800">Receita Total</h3>
            <p className="text-2xl font-semibold text-green-900">R$ {summary.totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-red-100 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-red-800">Despesa Total</h3>
            <p className="text-2xl font-semibold text-red-900">R$ {summary.totalExpense.toFixed(2)}</p>
          </div>
          <div className="bg-blue-100 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-blue-800">Saldo</h3>
            <p className="text-2xl font-semibold text-blue-900">R$ {summary.balance.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Form Section with Tabs */}
          <div className="md:col-span-1">
            <div className="mb-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveForm('transaction')}
                  className={`${
                    activeForm === 'transaction'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                >
                  Transação
                </button>
                <button
                  onClick={() => setActiveForm('transfer')}
                  className={`${
                    activeForm === 'transfer'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                >
                  Transferência
                </button>
              </nav>
            </div>

            {activeForm === 'transaction' ? (
              <div>
                <h2 className="mb-4 text-2xl font-semibold">Nova Transação</h2>
                <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição</label>
                    <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Valor</label>
                    <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="account" className="block text-sm font-medium text-gray-700">Conta</label>
                    <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                      <option value="">Selecione uma Conta</option>
                      {accounts.map((acc) => (
                        <option key={acc.account_id} value={acc.account_id}>{acc.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoria</label>
                    <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                      <option value="">Sem Categoria</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select id="type" value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full rounded-md bg-indigo-600 py-2 text-white hover:bg-indigo-700">Adicionar Transação</button>
                </form>
              </div>
            ) : (
              workspaceId && <TransferForm accounts={accounts} workspaceId={workspaceId} onTransferSuccess={fetchData} />
            )}
          </div>

        {/* Right Column */}
        <div className="md:col-span-2 space-y-8">
          {/* Transactions List Section */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Transações Recentes</h2>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <ul className="space-y-3">
                {processedTransactions.map((t) => (
                  <li key={t.transaction_id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="block font-medium">{t.description}</span>
                      <span className="text-sm text-gray-500">
                        {t.type === 'transfer'
                          ? `De: ${t.from_account} | Para: ${t.to_account}`
                          : t.account_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${
                        t.type === 'income' ? 'text-green-600'
                        : t.type === 'expense' ? 'text-red-600'
                        : 'text-gray-700'
                      }`}>
                        {t.type === 'expense' ? '-' : ''}R$ {t.amount}
                      </span>
                      {t.type !== 'transfer' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenModal(t)} className="text-gray-400 hover:text-blue-600">✏️</button>
                          <button onClick={() => handleDeleteTransaction(t.transaction_id)} className="text-gray-400 hover:text-red-600">🗑️</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Category Manager Section */}
          {workspaceId && (
            <CategoryManager
              categories={categories}
              workspaceId={workspaceId}
              onCategoryCreated={(newCategory) => setCategories([...categories, newCategory])}
            />
          )}

          {/* Account Manager Section */}
          {workspaceId && (
            <AccountManager
              accounts={accounts}
              workspaceId={workspaceId}
              onAccountCreated={(newAccount) => setAccounts([...accounts, newAccount])}
            />
          )}
          </div>
        </div>
      </main>
      <EditTransactionModal
        isOpen={isModalOpen}
        transaction={editingTransaction}
        categories={categories}
        onClose={handleCloseModal}
        onUpdate={handleUpdateTransaction}
      />
    </AuthGuard>
  );
}
