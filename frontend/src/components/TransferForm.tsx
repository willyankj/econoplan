'use client';

import { useState } from 'react';
import api from '@/services/api';

interface Account {
  account_id: string;
  account_name: string;
}

interface TransferFormProps {
  accounts: Account[];
  workspaceId: string;
  onTransferSuccess: () => void;
}

export default function TransferForm({ accounts, workspaceId, onTransferSuccess }: TransferFormProps) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fromAccountId === toAccountId) {
      setError('A conta de origem e destino não podem ser a mesma.');
      return;
    }

    try {
      await api.post('/transactions/transfer', {
        workspace_id: workspaceId,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: parseFloat(amount),
        description,
        transaction_date: new Date().toISOString().split('T')[0],
      });

      // Reset form and notify parent
      setFromAccountId('');
      setToAccountId('');
      setAmount('');
      setDescription('');
      onTransferSuccess();
    } catch (err) {
      setError('Falha ao registrar a transferência. Verifique os dados.');
      console.error(err);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Nova Transferência</h2>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <form onSubmit={handleTransfer} className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4">
          <label htmlFor="fromAccount" className="block text-sm font-medium text-gray-700">De (Origem)</label>
          <select
            id="fromAccount"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="">Selecione a conta de origem</option>
            {accounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>{acc.account_name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="toAccount" className="block text-sm font-medium text-gray-700">Para (Destino)</label>
          <select
            id="toAccount"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="">Selecione a conta de destino</option>
            {accounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>{acc.account_name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700">Valor</label>
          <input
            type="number"
            id="transferAmount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="transferDescription" className="block text-sm font-medium text-gray-700">Descrição</label>
          <input
            type="text"
            id="transferDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <button type="submit" className="w-full rounded-md bg-green-600 py-2 text-white hover:bg-green-700">
          Registrar Transferência
        </button>
      </form>
    </div>
  );
}
