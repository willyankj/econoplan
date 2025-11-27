import { prisma } from "@/lib/prisma";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getUserWorkspace } from "@/lib/get-user-workspace";

// ANALYTICS DO WORKSPACE
import { getWorkspaceCategoryComparison } from "@/app/dashboard/actions/analytics";
import { CategoryComparison } from "@/components/dashboard/analytics/category-comparison";

export const dynamic = 'force-dynamic';

const toCents = (val: number | string | any) => Math.round(Number(val) * 100);
const fromCents = (val: number) => val / 100;

function getDatesFromParams(from?: string, to?: string, month?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (from && to) {
    startDate = new Date(from + "T00:00:00");
    endDate = new Date(to + "T23:59:59");
  } else {
    let dateRef = now;
    if (month) {
      const [y, m] = month.split('-');
      dateRef = new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    startDate = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
    endDate = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0, 23, 59, 59);
  }
  return { startDate, endDate };
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ 
    month?: string, from?: string, to?: string,
    chartMonth?: string, chartFrom?: string, chartTo?: string 
  }>
}) {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const params = await searchParams;
  const globalDates = getDatesFromParams(params.from, params.to, params.month);

  const hasChartFilter = !!(params.chartFrom && params.chartTo) || !!params.chartMonth;
  const chartDates = hasChartFilter 
    ? getDatesFromParams(params.chartFrom, params.chartTo, params.chartMonth)
    : globalDates;

  // --- DADOS GERAIS ---
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));
  const totalBalance = fromCents(accounts.reduce((acc, a) => acc + toCents(a.balance), 0));

  const transactionsGlobal = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: globalDates.startDate, lte: globalDates.endDate }
    }
  });

  let transactionsChart = transactionsGlobal;
  if (hasChartFilter) {
      transactionsChart = await prisma.transaction.findMany({
        where: {
            workspaceId,
            date: { gte: chartDates.startDate, lte: chartDates.endDate }
        },
        orderBy: { date: 'asc' }
      });
  } else {
      transactionsChart = [...transactionsGlobal].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const monthlyIncomeCents = transactionsGlobal
    .filter(t => t.type === 'INCOME' && t.creditCardId === null)
    .reduce((acc, t) => acc + toCents(Number(t.amount)), 0);

  const monthlyExpenseCents = transactionsGlobal
    .filter(t => t.type === 'EXPENSE' && t.creditCardId === null)
    .reduce((acc, t) => acc + toCents(Number(t.amount)), 0);

  // Gráfico
  const diffDays = Math.ceil(Math.abs(chartDates.endDate.getTime() - chartDates.startDate.getTime()) / (1000 * 60 * 60 * 24)); 
  const isDailyChart = diffDays <= 35;
  const chartMap = new Map();

  if (isDailyChart) {
      for (let d = new Date(chartDates.startDate); d <= chartDates.endDate; d.setDate(d.getDate() + 1)) {
          const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          chartMap.set(key, { name: key, income: 0, expense: 0 });
      }
  } else {
      let d = new Date(chartDates.startDate);
      while (d <= chartDates.endDate) {
          const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
          const formattedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
          if (!chartMap.has(formattedKey)) chartMap.set(formattedKey, { name: formattedKey, income: 0, expense: 0 });
          d.setMonth(d.getMonth() + 1); d.setDate(1);
      }
  }

  transactionsChart.forEach(t => {
    if (t.creditCardId) return;
    let key = '';
    if (isDailyChart) key = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    else {
        const m = t.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        key = m.charAt(0).toUpperCase() + m.slice(1);
    }

    if (chartMap.has(key)) {
       const entry = chartMap.get(key);
       const valCents = toCents(Number(t.amount));
       if (t.type === 'INCOME') entry.income = fromCents(toCents(entry.income) + valCents);
       else entry.expense = fromCents(toCents(entry.expense) + valCents);
    }
  });

  const budgets = await prisma.budget.findMany({ where: { workspaceId }, include: { category: true } });
  const expMap: Record<string, number> = {};
  transactionsGlobal.filter(t => t.type === 'EXPENSE' && t.categoryId).forEach(t => {
      expMap[t.categoryId!] = (expMap[t.categoryId!] || 0) + toCents(Number(t.amount));
  });
  
  const budgetList = budgets.map(b => ({
      id: b.id, categoryName: b.category?.name || 'Geral', target: Number(b.targetAmount),
      spent: fromCents(expMap[b.categoryId || ''] || 0)
  }));

  const rawGoals = await prisma.goal.findMany({ where: { workspaceId }, orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }], take: 3, include: { transactions: true } });
  const goals = rawGoals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) }));

  // --- DADOS DE INTELIGÊNCIA DO WORKSPACE ---
  const comparisonData = await getWorkspaceCategoryComparison();

  const dashboardData = {
    totalBalance, 
    monthlyIncome: fromCents(monthlyIncomeCents), 
    monthlyExpense: fromCents(monthlyExpenseCents),
    chartData: Array.from(chartMap.values()), 
    lastTransactions: [], 
    budgets: budgetList, 
    goals,
    accounts
  };

  return (
    <div className="space-y-8">
        <DashboardOverview data={dashboardData} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* COMPARATIVO MENSAL */}
            <div className="md:col-span-1">
                <CategoryComparison data={comparisonData} />
            </div>
            
            {/* Espaço para futuros widgets do workspace */}
        </div>
    </div>
  );
}