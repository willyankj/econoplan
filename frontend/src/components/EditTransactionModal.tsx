'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

// Re-defining types here to avoid circular dependencies or complex type sharing for now.
export interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id?: string | null;
}
export interface Category {
  category_id: string;
  category_name: string;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onUpdate: (updatedTransaction: Transaction) => void;
}

export default function EditTransactionModal({ isOpen, transaction, categories, onClose, onUpdate }: EditTransactionModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState<string | ''>('');

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setCategoryId(transaction.category_id || '');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedData = {
        description,
        amount: parseFloat(amount),
        type,
        category_id: categoryId || null,
      };
      const response = await api.put(`/transactions/${transaction.transaction_id}`, updatedData);
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to update transaction', error);
      // Optionally, show an error message
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold">Edit Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium">Description</label>
            <input id="edit-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border p-2" required />
          </div>
          <div>
            <label htmlFor="edit-amount" className="block text-sm font-medium">Amount</label>
            <input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded border p-2" required />
          </div>
          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium">Category</label>
            <select id="edit-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded border p-2">
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-type" className="block text-sm font-medium">Type</label>
            <select id="edit-type" value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 w-full rounded border p-2">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="rounded bg-gray-300 py-2 px-4 hover:bg-gray-400">Cancel</button>
            <button type="submit" className="rounded bg-indigo-600 py-2 px-4 text-white hover:bg-indigo-700">Update</button>
          </div>
        </form>
      </div>
    </div>
  );
}
