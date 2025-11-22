import { prisma } from "@/lib/prisma";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getUserWorkspace } from "@/lib/get-user-workspace"; // <--- CORREÇÃO

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ chartRange?: string }>
}) {
  // 1. Identificar Workspace Ativo Corretamente
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const params = await searchParams;
  const chartRange = params.chartRange || '6m';

  // --- 2. DADOS KPI E CONTAS ---
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));
  const totalBalance = accounts.reduce((acc, account) => acc + account.balance, 0);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const transactionsMonth = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: firstDayOfMonth, lte: lastDayOfMonth }
    }
  });

  const monthlyIncome = transactionsMonth
    .filter(t => t.type === 'INCOME' && t.creditCardId === null)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const monthlyExpense = transactionsMonth
    .filter(t => t.type === 'EXPENSE' && t.creditCardId === null)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // --- 3. DADOS DE ORÇAMENTO (LISTA COMPLETA) ---
  const budgets = await prisma.budget.findMany({ 
      where: { workspaceId },
      include: { category: true }
  });
  
  // Busca despesas para calcular o progresso de cada orçamento
  const allExpensesMonth = await prisma.transaction.findMany({
    where: {
      workspaceId,
      type: 'EXPENSE',
      date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      categoryId: { in: budgets.map(b => b.categoryId).filter(id => id !== null) as string[] }
    }
  });

  const expensesByCategory: Record<string, number> = {};
  allExpensesMonth.forEach(t => {
    if (t.categoryId) {
        expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + Number(t.amount);
    }
  });

  const budgetList = budgets.map(b => ({
      id: b.id,
      categoryName: b.category?.name || 'Geral',
      target: Number(b.targetAmount),
      spent: expensesByCategory[b.categoryId || ''] || 0
  }));

  // --- 4. DADOS DE METAS ---
  const rawGoals = await prisma.goal.findMany({
    where: { workspaceId },
    orderBy: [ { deadline: 'asc' }, { createdAt: 'desc' } ],
    take: 3,
    include: { transactions: true }
  });

  const goals = rawGoals.map(g => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    transactions: g.transactions.map(t => ({...t, amount: Number(t.amount)}))
  }));

  // --- 5. DADOS DO GRÁFICO ---
  let startDate = new Date();
  const chartMap = new Map();

  if (chartRange === '30d') {
    startDate.setDate(now.getDate() - 30);
    for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayKey = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        chartMap.set(dayKey, { name: dayKey, income: 0, expense: 0 });
    }
  } else {
    startDate.setMonth(now.getMonth() - 5);
    startDate.setDate(1);
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const formattedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
        chartMap.set(formattedKey, { name: formattedKey, income: 0, expense: 0 });
    }
  }

  const chartTransactions = await prisma.transaction.findMany({
    where: { 
        workspaceId,
        date: { gte: startDate },
        creditCardId: null 
    },
    orderBy: { date: 'asc' }
  });

  chartTransactions.forEach(t => {
    let key = '';
    if (chartRange === '30d') {
        key = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } else {
        const monthKey = t.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        key = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
    }

    if (chartMap.has(key)) {
       const entry = chartMap.get(key);
       if (t.type === 'INCOME') entry.income += Number(t.amount);
       else entry.expense += Number(t.amount);
    }
  });

  const dashboardData = {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    chartData: Array.from(chartMap.values()),
    lastTransactions: [],
    budgets: budgetList, // <--- ENVIA A LISTA, NÃO O RESUMO
    goals,
    accounts
  };

  return <DashboardOverview data={dashboardData} />;
}
