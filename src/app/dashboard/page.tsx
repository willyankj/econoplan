import { prisma } from "@/lib/prisma";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getUserWorkspace } from "@/lib/get-user-workspace";

export const dynamic = 'force-dynamic';

const toCents = (val: number | string | any) => Math.round(Number(val) * 100);
const fromCents = (val: number) => val / 100;

// Função auxiliar para calcular datas
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
    chartMonth?: string, chartFrom?: string, chartTo?: string // Novos Params
  }>
}) {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const params = await searchParams;

  // 1. CALCULA DATAS GLOBAIS (Para KPIs)
  const globalDates = getDatesFromParams(params.from, params.to, params.month);

  // 2. CALCULA DATAS DO GRÁFICO (Específico ou Fallback para Global)
  // Verifica se existe filtro específico do gráfico
  const hasChartFilter = !!(params.chartFrom && params.chartTo) || !!params.chartMonth;
  
  const chartDates = hasChartFilter 
    ? getDatesFromParams(params.chartFrom, params.chartTo, params.chartMonth)
    : globalDates; // Se não tiver filtro, usa o global

  // --- BUSCAS NO BANCO ---
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));
  const totalBalanceCents = accounts.reduce((acc, account) => acc + toCents(account.balance), 0);
  const totalBalance = fromCents(totalBalanceCents);

  // A. Transações GLOBAIS (Para KPIs)
  const transactionsGlobal = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: globalDates.startDate, lte: globalDates.endDate }
    }
  });

  // B. Transações GRÁFICO (Se as datas forem diferentes, busca de novo. Se iguais, reutiliza)
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
      // Apenas garante a ordenação se reutilizar
      transactionsChart.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // --- CÁLCULO DOS KPIS (Baseado no Global) ---
  const monthlyIncomeCents = transactionsGlobal
    .filter(t => t.type === 'INCOME' && t.creditCardId === null)
    .reduce((acc, t) => acc + toCents(Number(t.amount)), 0);

  const monthlyExpenseCents = transactionsGlobal
    .filter(t => t.type === 'EXPENSE' && t.creditCardId === null)
    .reduce((acc, t) => acc + toCents(Number(t.amount)), 0);

  // --- CÁLCULO DO GRÁFICO (Baseado no Chart Dates) ---
  const diffTime = Math.abs(chartDates.endDate.getTime() - chartDates.startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const isDailyChart = diffDays <= 35; // Aumentei um pouco a tolerância para meses longos + margem

  const chartMap = new Map();

  if (isDailyChart) {
      for (let d = new Date(chartDates.startDate); d <= chartDates.endDate; d.setDate(d.getDate() + 1)) {
          const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          chartMap.set(key, { name: key, income: 0, expense: 0 });
      }
  } else {
      let d = new Date(chartDates.startDate);
      // Ajuste para garantir que o loop cubra todo o intervalo mensal
      // (simplificação: loop até passar a data final)
      while (d <= chartDates.endDate) {
          const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
          const formattedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
          if (!chartMap.has(formattedKey)) {
             chartMap.set(formattedKey, { name: formattedKey, income: 0, expense: 0 });
          }
          d.setMonth(d.getMonth() + 1);
          d.setDate(1); // Garante que vá para o dia 1 do próximo mês para evitar pular meses curtos
      }
  }

  transactionsChart.forEach(t => {
    if (t.creditCardId) return;

    let key = '';
    if (isDailyChart) {
        key = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } else {
        const monthKey = t.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        key = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
    }

    if (chartMap.has(key)) {
       const entry = chartMap.get(key);
       const valCents = toCents(Number(t.amount));
       const currentIncCents = toCents(entry.income);
       const currentExpCents = toCents(entry.expense);

       if (t.type === 'INCOME') {
           entry.income = fromCents(currentIncCents + valCents);
       } else {
           entry.expense = fromCents(currentExpCents + valCents);
       }
    }
  });

  // --- RESTANTE (Metas e Orçamentos - baseados no Global para consistência com KPIs ou Chart?
  // Geralmente Orçamentos são mensais fixos, vamos manter baseados no Global para alinhar com os cards de cima)
  const budgets = await prisma.budget.findMany({ where: { workspaceId }, include: { category: true } });
  const expensesForBudgets = transactionsGlobal.filter(t => t.type === 'EXPENSE' && t.categoryId);
  const expensesByCategoryCents: Record<string, number> = {};
  expensesForBudgets.forEach(t => {
    if (t.categoryId) {
        const amountCents = toCents(Number(t.amount));
        expensesByCategoryCents[t.categoryId] = (expensesByCategoryCents[t.categoryId] || 0) + amountCents;
    }
  });
  const budgetList = budgets.map(b => ({
      id: b.id, categoryName: b.category?.name || 'Geral', target: Number(b.targetAmount),
      spent: fromCents(expensesByCategoryCents[b.categoryId || ''] || 0)
  }));

  const rawGoals = await prisma.goal.findMany({ where: { workspaceId }, orderBy: [ { deadline: 'asc' }, { createdAt: 'desc' } ], take: 3, include: { transactions: true } });
  const goals = rawGoals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount), transactions: g.transactions.map(t => ({...t, amount: Number(t.amount)})) }));

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

  return <DashboardOverview data={dashboardData} />;
}