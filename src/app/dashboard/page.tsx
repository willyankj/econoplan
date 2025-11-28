import { prisma } from "@/lib/prisma";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getUserWorkspace } from "@/lib/get-user-workspace";
import { getWorkspaceCategoryComparison, getUpcomingBills } from "@/app/dashboard/actions";
import { CategoryComparison } from "@/components/dashboard/analytics/category-comparison";
import { UpcomingBills } from "@/components/dashboard/upcoming-bills";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = 'force-dynamic';

const toDecimal = (val: any) => Number(val) || 0;

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
    startDate = startOfMonth(dateRef);
    endDate = endOfMonth(dateRef);
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

  // 1. SALDO TOTAL (Otimizado: Soma direta no banco)
  const accounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const totalBalance = accounts.reduce((acc, a) => acc + toDecimal(a.balance), 0);

  // 2. TOTAIS MENSAIS (Otimizado: Agregação no Banco)
  // Filtramos fora o cartão de crédito para pegar fluxo de caixa real
  const incomeAgg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { workspaceId, type: 'INCOME', creditCardId: null, date: { gte: globalDates.startDate, lte: globalDates.endDate } }
  });
  const expenseAgg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { workspaceId, type: 'EXPENSE', creditCardId: null, date: { gte: globalDates.startDate, lte: globalDates.endDate } }
  });

  // 3. DADOS DO GRÁFICO (Leve: Só campos necessários)
  const chartTransactions = await prisma.transaction.findMany({
      where: { workspaceId, creditCardId: null, date: { gte: chartDates.startDate, lte: chartDates.endDate } },
      select: { date: true, amount: true, type: true },
      orderBy: { date: 'asc' }
  });

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

  chartTransactions.forEach(t => {
    let key = '';
    if (isDailyChart) key = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    else {
        const m = t.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        key = m.charAt(0).toUpperCase() + m.slice(1);
    }

    if (chartMap.has(key)) {
       const entry = chartMap.get(key);
       const val = toDecimal(t.amount);
       if (t.type === 'INCOME') entry.income += val;
       else entry.expense += val;
    }
  });

  // 4. ORÇAMENTOS (Otimizado: GroupBy no banco)
  const budgets = await prisma.budget.findMany({ where: { workspaceId }, include: { category: true } });
  
  // Agrupa gastos por categoria direto no banco
  const expensesByCategory = await prisma.transaction.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: { workspaceId, type: 'EXPENSE', categoryId: { not: null }, date: { gte: globalDates.startDate, lte: globalDates.endDate } }
  });
  
  // Cria mapa para acesso rápido
  const expMap = new Map();
  expensesByCategory.forEach(e => { if(e.categoryId) expMap.set(e.categoryId, toDecimal(e._sum.amount)); });

  const budgetList = budgets.map(b => ({
      id: b.id, categoryName: b.category?.name || 'Geral', target: Number(b.targetAmount),
      spent: expMap.get(b.categoryId) || 0
  }));

  // 5. METAS
  const rawGoals = await prisma.goal.findMany({ where: { workspaceId }, orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }], take: 3 });
  const goals = rawGoals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) }));

  // 6. WIDGETS EXTRAS
  const comparisonData = await getWorkspaceCategoryComparison();
  const upcomingBills = await getUpcomingBills();

  const dashboardData = {
    totalBalance, 
    monthlyIncome: toDecimal(incomeAgg._sum.amount), 
    monthlyExpense: toDecimal(expenseAgg._sum.amount),
    chartData: Array.from(chartMap.values()), 
    lastTransactions: [], // Não usamos mais aqui, economiza banda
    budgets: budgetList, 
    goals,
    accounts
  };

  return (
    <div className="space-y-8">
        <DashboardOverview data={dashboardData} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryComparison data={comparisonData} />
            <UpcomingBills bills={upcomingBills} />
        </div>
    </div>
  );
}