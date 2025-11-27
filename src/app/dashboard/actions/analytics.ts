'use server';

import { prisma } from "@/lib/prisma";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { addMonths, startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const toDecimal = (num: any) => Number(num) || 0;

// ============================================================================
// 1. ORÁCULO FINANCEIRO (Tenant ou Workspace Específico)
// ============================================================================
export async function getTenantOracleData(monthsToProject = 6, filterWorkspaceId?: string) {
  const { user } = await validateUser('org_view');
  if (!user) return { balanceData: [] };

  const today = new Date();
  const endDate = addMonths(today, monthsToProject);

  // Filtro dinâmico: Se tiver ID, filtra pelo ID. Se não, pega todos do Tenant.
  const workspaceFilter = filterWorkspaceId 
    ? { id: filterWorkspaceId, tenantId: user.tenantId }
    : { tenantId: user.tenantId };

  // 1. Saldo Atual
  const accounts = await prisma.bankAccount.findMany({
    where: { workspace: workspaceFilter }
  });
  let currentBalance = accounts.reduce((acc, cur) => acc + toDecimal(cur.balance), 0);

  // 2. Transações Futuras
  const futureTransactions = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      date: { gt: today, lte: endDate }
    }
  });

  // 3. Recorrências
  const recurringTransactions = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      isRecurring: true,
    }
  });

  const timeline = [];
  let runningBalance = currentBalance;

  for (let i = 0; i <= monthsToProject; i++) {
    const currentDate = addMonths(today, i);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthLabel = format(currentDate, 'MMM', { locale: ptBR }).toUpperCase();

    // A. Real
    const monthRealTx = futureTransactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const incomeReal = monthRealTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + toDecimal(t.amount), 0);
    const expenseReal = monthRealTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + toDecimal(t.amount), 0);

    // B. Projetado
    let incomeProjected = 0;
    let expenseProjected = 0;

    if (i > 0) { 
        recurringTransactions.forEach(t => {
             if (t.type === 'INCOME') incomeProjected += toDecimal(t.amount);
             else expenseProjected += toDecimal(t.amount);
        });
    }

    const netChange = (incomeReal + incomeProjected) - (expenseReal + expenseProjected);
    runningBalance += netChange;

    timeline.push({
        name: monthLabel,
        balance: runningBalance,
        income: incomeReal + incomeProjected,
        expense: expenseReal + expenseProjected,
        isNegative: runningBalance < 0
    });
  }

  return { balanceData: timeline };
}

// ============================================================================
// 2. RAIO-X DE ENDIVIDAMENTO
// ============================================================================
export async function getTenantDebtXRayData(filterWorkspaceId?: string) {
  const { user } = await validateUser('org_view');
  if (!user) return { chartData: [], cardNames: [] };

  const today = new Date();
  const endDate = addMonths(today, 11); 

  const workspaceFilter = filterWorkspaceId 
    ? { id: filterWorkspaceId, tenantId: user.tenantId }
    : { tenantId: user.tenantId };

  const cardTransactions = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      type: 'EXPENSE',
      creditCardId: { not: null },
      date: { gte: startOfMonth(today), lte: endDate }
    },
    include: { creditCard: true }
  });

  const monthsMap = new Map<string, any>();
  const cardSet = new Set<string>();

  for (let i = 0; i < 12; i++) {
      const d = addMonths(today, i);
      const key = format(d, 'MMM/yy', { locale: ptBR }).toUpperCase();
      monthsMap.set(key, { name: key, total: 0 }); 
  }

  cardTransactions.forEach(t => {
      const key = format(t.date, 'MMM/yy', { locale: ptBR }).toUpperCase();
      const cardName = t.creditCard?.name || 'Outros';
      cardSet.add(cardName);

      if (monthsMap.has(key)) {
          const entry = monthsMap.get(key);
          entry[cardName] = (entry[cardName] || 0) + toDecimal(t.amount);
          entry.total += toDecimal(t.amount);
      }
  });

  return {
      chartData: Array.from(monthsMap.values()),
      cardNames: Array.from(cardSet)
  };
}

// ============================================================================
// 3. COMPARATIVO MÊS A MÊS (Workspace Local)
// ============================================================================
export async function getWorkspaceCategoryComparison() {
    const { user } = await validateUser();
    if (!user) return [];
    const workspaceId = await getActiveWorkspaceId(user);

    const today = new Date();
    const currentStart = startOfMonth(today);
    const currentEnd = endOfMonth(today);

    const pastStart = startOfMonth(subMonths(today, 3));
    const pastEnd = endOfMonth(subMonths(today, 1));

    const transactions = await prisma.transaction.findMany({
        where: {
            workspaceId,
            type: 'EXPENSE',
            date: { gte: pastStart, lte: currentEnd },
            categoryId: { not: null }
        },
        include: { category: true }
    });

    const currentMap = new Map<string, number>();
    const historyMap = new Map<string, number>();

    transactions.forEach(t => {
        const catName = t.category?.name || "Outros";
        const val = toDecimal(t.amount);

        if (t.date >= currentStart) {
            currentMap.set(catName, (currentMap.get(catName) || 0) + val);
        } else if (t.date >= pastStart && t.date <= pastEnd) {
            historyMap.set(catName, (historyMap.get(catName) || 0) + val);
        }
    });

    const report = Array.from(currentMap.keys()).map(cat => {
        const current = currentMap.get(cat) || 0;
        const totalHistory = historyMap.get(cat) || 0;
        const average = totalHistory / 3; 

        let status = "neutral";
        let diffPercent = 0;

        if (average > 0) {
            diffPercent = ((current - average) / average) * 100;
            if (diffPercent > 15) status = "danger"; 
            else if (diffPercent < -15) status = "success"; 
        } else if (current > 0) {
            status = "danger"; 
            diffPercent = 100;
        }

        return { category: cat, current, average, diffPercent, status };
    });

    return report.sort((a, b) => (b.current - b.average) - (a.current - a.average));
}

// ============================================================================
// 4. ÍNDICE DE SAÚDE FINANCEIRA
// ============================================================================
export async function getTenantHealthScore(filterWorkspaceId?: string) {
    const { user } = await validateUser('org_view');
    if (!user) return { score: 0, metrics: {} };

    const today = new Date();
    const start = subMonths(today, 1);

    const workspaceFilter = filterWorkspaceId 
    ? { id: filterWorkspaceId, tenantId: user.tenantId }
    : { tenantId: user.tenantId };

    const transactions = await prisma.transaction.findMany({
        where: {
            workspace: workspaceFilter,
            date: { gte: start }
        }
    });

    const accounts = await prisma.bankAccount.findMany({
        where: { workspace: workspaceFilter }
    });

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + toDecimal(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + toDecimal(t.amount), 0);
    const totalBalance = accounts.reduce((acc, a) => acc + toDecimal(a.balance), 0);

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    let savingsScore = 0;
    if (savingsRate >= 20) savingsScore = 40;
    else if (savingsRate > 0) savingsScore = savingsRate * 2;
    else savingsScore = 0;

    const monthlyAvgExpense = totalExpense || 1; 
    const coverageMonths = totalBalance / monthlyAvgExpense;
    let coverageScore = 0;
    if (coverageMonths >= 3) coverageScore = 40;
    else coverageScore = (coverageMonths / 3) * 40;

    // 3. Aderência ao Orçamento (Peso 20)
    let budgetScore = 20;
    if (savingsRate < 0 || totalIncome === 0) budgetScore = 0;

    const totalScore = Math.min(100, Math.round(savingsScore + coverageScore + budgetScore));

    return {
        score: totalScore,
        metrics: {
            savingsRate,
            coverageMonths,
            isPositive: savingsRate > 0
        }
    };
}