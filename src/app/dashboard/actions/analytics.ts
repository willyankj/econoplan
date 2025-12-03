'use server';

import { prisma } from "@/lib/prisma";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { addMonths, startOfMonth, endOfMonth, format, subMonths, differenceInCalendarMonths, isBefore, addWeeks, addYears, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const toDecimal = (num: any) => Number(num) || 0;

// ============================================================================
// 1. ORÁCULO FINANCEIRO
// ============================================================================
export async function getTenantOracleData(filterWorkspaceId?: string, dateRange?: { from: Date, to: Date }) {
  const { user } = await validateUser('org_view');
  if (!user) return { balanceData: [] };

  const today = new Date();
  
  let projectUntil = dateRange?.to ? new Date(dateRange.to) : addMonths(today, 6);
  if (isBefore(projectUntil, today)) {
      projectUntil = addMonths(today, 1);
  }

  const monthsToProject = Math.max(1, differenceInCalendarMonths(projectUntil, today));

  const workspaceFilter = filterWorkspaceId 
    ? { id: filterWorkspaceId, tenantId: user.tenantId }
    : { tenantId: user.tenantId };

  const accounts = await prisma.bankAccount.findMany({
    where: { workspace: workspaceFilter }
  });
  let currentBalance = accounts.reduce((acc, cur) => acc + toDecimal(cur.balance), 0);

  const futureTransactions = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      date: { gt: today, lte: projectUntil }
    }
  });

  const recurringDefs = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      isRecurring: true,
      nextRecurringDate: { not: null }
    }
  });

  const projectionMap = new Map<string, { income: number, expense: number }>();

  recurringDefs.forEach(def => {
      let pointer = new Date(def.nextRecurringDate!);
      
      while (pointer <= projectUntil) {
          const key = format(pointer, 'yyyy-MM');
          
          if (!projectionMap.has(key)) projectionMap.set(key, { income: 0, expense: 0 });
          const entry = projectionMap.get(key)!;

          if (def.type === 'INCOME') entry.income += toDecimal(def.amount);
          else entry.expense += toDecimal(def.amount);

          if (def.frequency === 'WEEKLY') pointer = addWeeks(pointer, 1);
          else if (def.frequency === 'YEARLY') pointer = addYears(pointer, 1);
          else pointer = addMonths(pointer, 1);
      }
  });

  const timeline = [];
  let runningBalance = currentBalance;

  for (let i = 0; i <= monthsToProject; i++) {
    const currentDate = addMonths(today, i);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthLabel = format(currentDate, 'MMM', { locale: ptBR }).toUpperCase();
    const monthKey = format(currentDate, 'yyyy-MM');

    const monthRealTx = futureTransactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const incomeReal = monthRealTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + toDecimal(t.amount), 0);
    const expenseReal = monthRealTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + toDecimal(t.amount), 0);

    const projected = projectionMap.get(monthKey) || { income: 0, expense: 0 };

    const totalIncome = incomeReal + projected.income;
    const totalExpense = expenseReal + projected.expense;
    const netChange = totalIncome - totalExpense;
    
    runningBalance += netChange;

    timeline.push({
        name: monthLabel,
        dateRef: monthStart, 
        balance: runningBalance,
        income: totalIncome,
        expense: totalExpense,
        isNegative: runningBalance < 0
    });
  }

  const filteredData = timeline.filter(item => {
      if (!dateRange) return true; 
      return item.dateRef >= startOfMonth(dateRange.from) && item.dateRef <= endOfMonth(dateRange.to);
  });

  return { balanceData: filteredData };
}

// ============================================================================
// 2. RAIO-X DE ENDIVIDAMENTO
// ============================================================================
export async function getTenantDebtXRayData(filterWorkspaceId?: string) {
    const { user } = await validateUser('org_view');
    if (!user) return { chartData: [], cardNames: [] };
  
    const today = new Date();
    const searchEnd = addMonths(today, 18); 
  
    const workspaceFilter = filterWorkspaceId 
      ? { id: filterWorkspaceId, tenantId: user.tenantId }
      : { tenantId: user.tenantId };
  
    const cardTransactions = await prisma.transaction.findMany({
      where: {
        workspace: workspaceFilter,
        type: 'EXPENSE',
        creditCardId: { not: null },
        isPaid: false, 
        date: { lte: searchEnd }
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
        if (!t.creditCard) return;
  
        const txDate = new Date(t.date);
        const closingDay = t.creditCard.closingDay;
        const dueDay = t.creditCard.dueDay;
  
        let referenceClosingDate = new Date(txDate.getFullYear(), txDate.getMonth(), closingDay);
        if (txDate.getDate() >= closingDay) {
            referenceClosingDate = addMonths(referenceClosingDate, 1);
        }
  
        let dueDate = new Date(referenceClosingDate.getFullYear(), referenceClosingDate.getMonth(), dueDay);
        if (dueDate <= referenceClosingDate) {
            dueDate = addMonths(dueDate, 1);
        }
  
        const key = format(dueDate, 'MMM/yy', { locale: ptBR }).toUpperCase();
        const cardName = t.creditCard.name;
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
// 3. COMPARATIVO MÊS A MÊS
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

// ============================================================================
// 5. ANALYTICS GERAL DO TENANT (CORREÇÃO: Adicionada função que faltava)
// ============================================================================
export async function getTenantAnalytics(period: string, type?: string, workspaceId?: string) {
    const { user } = await validateUser('org_view');
    if (!user) return { chartData: [], totals: { income: 0, expense: 0, transfer: 0, investment: 0 } };

    const now = new Date();
    let startDate = startOfMonth(now);
    let endDate = endOfMonth(now);

    if (period === 'last_month') {
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
    } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    } else if (period === 'all') {
        startDate = new Date(2000, 0, 1);
    }

    // Filtros
    const where: any = {
        workspace: { tenantId: user.tenantId },
        date: { gte: startDate, lte: endDate }
    };

    if (workspaceId && workspaceId !== 'all') {
        where.workspaceId = workspaceId;
    }

    if (type && type !== 'all') {
        if (type === 'INVESTMENT') {
             where.type = { in: ['VAULT_DEPOSIT', 'VAULT_WITHDRAW'] };
        } else {
             where.type = type;
        }
    }

    const data = await prisma.transaction.findMany({
        where,
        orderBy: { date: 'asc' },
        select: {
            date: true,
            amount: true,
            type: true
        }
    });

    // Processamento
    const chartDataMap = new Map();
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;
    let totalInvestment = 0;

    data.forEach(t => {
        // Agregação para o gráfico
        const day = format(t.date, 'dd/MM');
        if (!chartDataMap.has(day)) {
            chartDataMap.set(day, { name: day, income: 0, expense: 0, transfer: 0, investment: 0 });
        }
        const entry = chartDataMap.get(day);
        const val = Number(t.amount);

        if (t.type === 'INCOME') entry.income += val;
        else if (t.type === 'EXPENSE') entry.expense += val;
        else if (t.type === 'TRANSFER') entry.transfer += val;
        else if (t.type === 'VAULT_DEPOSIT' || t.type === 'VAULT_WITHDRAW') entry.investment += val;

        // Totais Gerais
        if (t.type === 'INCOME') totalIncome += val;
        else if (t.type === 'EXPENSE') totalExpense += val;
        else if (t.type === 'TRANSFER') totalTransfer += val;
        else if (t.type.startsWith('VAULT')) totalInvestment += val;
    });

    return {
        chartData: Array.from(chartDataMap.values()),
        totals: {
            income: totalIncome,
            expense: totalExpense,
            transfer: totalTransfer,
            investment: totalInvestment
        }
    };
}