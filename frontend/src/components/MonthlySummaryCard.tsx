// src/components/MonthlySummaryCard.tsx
'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

const MonthlySummaryCard: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const workspaceId = localStorage.getItem('workspaceId');
      if (!workspaceId) {
        setError('Workspace ID não encontrado.');
        setIsLoading(false);
        return;
      }

      const date = new Date();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      try {
        const response = await api.get('/dashboard/summary', {
          params: { workspaceId, month, year },
        });
        setSummary(response.data);
      } catch (err) {
        setError('Falha ao carregar o resumo financeiro.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (isLoading) {
    return <div className="text-center p-6">Carregando resumo...</div>;
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">{error}</div>;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
      <div className="bg-green-100 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-green-800">Receita do Mês</h3>
        <p className="text-2xl font-semibold text-green-900">
          R$ {summary.totalIncome.toFixed(2)}
        </p>
      </div>
      <div className="bg-red-100 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-red-800">Despesa do Mês</h3>
        <p className="text-2xl font-semibold text-red-900">
          R$ {summary.totalExpense.toFixed(2)}
        </p>
      </div>
      <div className="bg-blue-100 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-blue-800">Saldo do Mês</h3>
        <p className="text-2xl font-semibold text-blue-900">
          R$ {summary.balance.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default MonthlySummaryCard;
