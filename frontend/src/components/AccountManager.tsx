'use client';

import { useState } from 'react';
import api from '@/services/api';

interface Account {
  account_id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface AccountManagerProps {
  accounts: Account[];
  workspaceId: string;
  onAccountCreated: (newAccount: Account) => void;
}

export default function AccountManager({ accounts, workspaceId, onAccountCreated }: AccountManagerProps) {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [balance, setBalance] = useState('');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !balance.trim()) return;

    try {
      const response = await api.post('/accounts', {
        workspace_id: workspaceId,
        account_name: accountName,
        account_type: accountType,
        balance: parseFloat(balance),
      });
      onAccountCreated(response.data);
      setAccountName('');
      setAccountType('checking');
      setBalance('');
    } catch (error) {
      console.error('Failed to create account', error);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Gerenciar Contas</h2>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleCreateAccount} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Nome da conta"
            className="rounded-md border-gray-300 shadow-sm md:col-span-1"
          />
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm md:col-span-1"
          >
            <option value="checking">Conta Corrente</option>
            <option value="savings">Poupança</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="investment">Investimento</option>
            <option value="cash">Dinheiro</option>
          </select>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="Saldo Inicial"
            className="rounded-md border-gray-300 shadow-sm md:col-span-1"
          />
          <button type="submit" className="rounded-md bg-blue-600 py-2 px-4 text-white hover:bg-blue-700 md:col-span-1">
            Adicionar Conta
          </button>
        </form>

        <ul className="space-y-2">
          {accounts.map((acc) => (
            <li key={acc.account_id} className="flex justify-between rounded-md bg-gray-100 p-2">
              <span>{acc.account_name} ({acc.account_type})</span>
              <span>R$ {acc.balance}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
