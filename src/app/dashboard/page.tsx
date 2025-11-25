import { prisma } from "@/lib/prisma";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getUserWorkspace } from "@/lib/get-user-workspace";

export const dynamic = 'force-dynamic';

// --- HELPERS MATEMÁTICOS SEGUROS ---
// Aceita number ou string, converte para number e multiplica por 100 para centavos
const toCents = (val: number | string | any) => Math.round(Number(val) * 100);
const fromCents = (val: number) => val / 100;

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ chartRange?: string }>
}) {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const params = await searchParams;
  const chartRange = params.chartRange || '6m';

  // --- DADOS KPI E CONTAS ---
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  // Aqui já convertemos balance para Number, então accounts[i].balance é number
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));
  
  // Soma Segura em Centavos (account.balance já é number)
  const totalBalanceCents = accounts.reduce((acc, account) => acc + toCents(account.balance), 0);
  const totalBalance = fromCents(totalBalanceCents);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Transações vêm cruas do Prisma, então amount é Decimal
  const transactionsMonth = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: firstDayOfMonth, lte: lastDayOfMonth }
    }
  });

  // CORREÇÃO: Convertemos t.amount para Number() antes de passar para toCents
  const monthlyIncomeCents = transactionsMonth
    .filter(t => t.type === 'INCOME' && t.creditCardId === null)
    .reduce((acc, t) => acc + toCents(Number(t.amount)), 0);

  const monthlyExpenseCents = transactionsMonth
    .filter(t => t.type === 'EXPENSE' && t.creditCardId === null)
    .reduce((acc, t) => acc + toCents(Number(t.amount)), 0);

  const monthlyIncome = fromCents(monthlyIncomeCents);
  const monthlyExpense = fromCents(monthlyExpenseCents);

  // --- ORÇAMENTOS ---
  const budgets = await prisma.budget.findMany({ 
      where: { workspaceId },
      include: { category: true }
  });
  
  const allExpensesMonth = await prisma.transaction.findMany({
    where: {
      workspaceId,
      type: 'EXPENSE',
      date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      categoryId: { in: budgets.map(b => b.categoryId).filter(id => id !== null) as string[] }
    }
  });

  // Mapa de Despesas em Centavos
  const expensesByCategoryCents: Record<string, number> = {};
  allExpensesMonth.forEach(t => {
    if (t.categoryId) {
        const amountCents = toCents(Number(t.amount));
        const prevCents = expensesByCategoryCents[t.categoryId] || 0;
        expensesByCategoryCents[t.categoryId] = prevCents + amountCents;
    }
  });

  const budgetList = budgets.map(b => ({
      id: b.id,
      categoryName: b.category?.name || 'Geral',
      target: Number(b.targetAmount),
      spent: fromCents(expensesByCategoryCents[b.categoryId || ''] || 0)
  }));

  // --- METAS ---
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

  // --- DADOS DO GRÁFICO ---
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

  // Processamento do Gráfico usando Centavos
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
       const valCents = toCents(Number(t.amount));
       
       // Armazenamos temporariamente em centavos dentro do objeto e convertemos no final
       const currentIncCents = toCents(entry.income);
       const currentExpCents = toCents(entry.expense);

       if (t.type === 'INCOME') {
           entry.income = fromCents(currentIncCents + valCents);
       } else {
           entry.expense = fromCents(currentExpCents + valCents);
       }
    }
  });

  const dashboardData = {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    chartData: Array.from(chartMap.values()),
    lastTransactions: [],
    budgets: budgetList, 
    goals,
    accounts
  };

  return <DashboardOverview data={dashboardData} />;
}