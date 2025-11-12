'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import AuthGuard from '@/components/AuthGuard';
import CategoryManager from '@/components/CategoryManager';
import EditTransactionModal, { Transaction } from '@/components/EditTransactionModal';

// Redefine Category here to be passed down, though this is not ideal.
// A better solution would be a shared types file.
interface Category {
  category_id: string;
  category_name: string;
}

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState<string | ''>('');
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
      const [transactionsRes, categoriesRes, summaryRes] = await Promise.all([
        api.get(`/transactions?workspaceId=${id}&_=${timestamp}`),
        api.get(`/categories?workspaceId=${id}&_=${timestamp}`),
        api.get(`/dashboard/summary?workspaceId=${id}&month=${month}&year=${year}&_=${timestamp}`)
      ]);
      setTransactions(transactionsRes.data);
      setCategories(categoriesRes.data);
      setSummary(summaryRes.data);
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
          {/* Form Section */}
          <div className="md:col-span-1">
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

        {/* Right Column */}
        <div className="md:col-span-2 space-y-8">
          {/* Transactions List Section */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Transações Recentes</h2>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <ul className="space-y-3">
                {transactions.map((t) => (
                  <li key={t.transaction_id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="block font-medium">{t.description}</span>
                      {/* We will display category name here later */}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {t.amount}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(t)} className="text-gray-400 hover:text-blue-600">✏️</button>
                        <button onClick={() => handleDeleteTransaction(t.transaction_id)} className="text-gray-400 hover:text-red-600">🗑️</button>
                      </div>
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
