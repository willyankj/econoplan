'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import AuthGuard from '@/components/AuthGuard'; // Import the AuthGuard

interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
}

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('workspaceId');
    router.push('/login');
  };

  useEffect(() => {
    const id = localStorage.getItem('workspaceId');
    setWorkspaceId(id);

    const fetchTransactions = async () => {
      if (!id) return;
      try {
        const response = await api.get(`/transactions?workspaceId=${id}`);
        setTransactions(response.data);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
      }
    };

    fetchTransactions();
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
        transaction_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      };
      const response = await api.post('/transactions', newTransaction);
      setTransactions([response.data, ...transactions]);
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
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Form Section */}
          <div className="md:col-span-1">
            <h2 className="mb-4 text-2xl font-semibold">New Transaction</h2>
            <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
              </div>
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
              </div>
              <div className="mb-6">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
                <select id="type" value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <button type="submit" className="w-full rounded-md bg-indigo-600 py-2 text-white hover:bg-indigo-700">Add Transaction</button>
            </form>
          </div>

          {/* Transactions List Section */}
          <div className="md:col-span-2">
            <h2 className="mb-4 text-2xl font-semibold">Recent Transactions</h2>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <ul>
                {transactions.map((t) => (
                  <li key={t.transaction_id} className={`flex justify-between border-b py-3 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{t.description}</span>
                    <span>R$ {t.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
