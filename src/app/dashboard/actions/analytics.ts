'use server';

import { prisma } from "@/lib/prisma";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { addMonths, startOfMonth, endOfMonth, format, subMonths, differenceInCalendarMonths, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

const toDecimal = (num: any) => Number(num) || 0;

// ============================================================================
// 1. ORÁCULO FINANCEIRO (Tenant ou Workspace Específico)
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

    const monthRealTx = futureTransactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const incomeReal = monthRealTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + toDecimal(t.amount), 0);
    const expenseReal = monthRealTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + toDecimal(t.amount), 0);

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
        dateRef: monthStart, 
        balance: runningBalance,
        income: incomeReal + incomeProjected,
        expense: expenseReal + expenseProjected,
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
// 2. RAIO-X DE ENDIVIDAMENTO (Faturas Futuras Reais)
// ============================================================================
export async function getTenantDebtXRayData(filterWorkspaceId?: string) {
  const { user } = await validateUser('org_view');
  if (!user) return { chartData: [], cardNames: [] };

  const today = new Date();
  // Busca transações futuras o suficiente para cobrir parcelamentos longos (18 meses)
  const searchEnd = addMonths(today, 18); 

  const workspaceFilter = filterWorkspaceId 
    ? { id: filterWorkspaceId, tenantId: user.tenantId }
    : { tenantId: user.tenantId };

  // 1. Busca apenas o que NÃO FOI PAGO (isPaid: false)
  // Isso garante que quando você paga a fatura, o gasto some daqui.
  const cardTransactions = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      type: 'EXPENSE',
      creditCardId: { not: null },
      isPaid: false, 
      date: { lte: searchEnd } // Pega tudo até o fim da busca
    },
    include: { creditCard: true }
  });

  const monthsMap = new Map<string, any>();
  const cardSet = new Set<string>();

  // Inicializa os próximos 12 meses no gráfico (Visualização)
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

      // Lógica de Ciclo do Cartão:
      // 1. Define a data de fechamento no mês da compra
      let referenceClosingDate = new Date(txDate.getFullYear(), txDate.getMonth(), closingDay);
      
      // 2. Se a compra foi DEPOIS do fechamento (ou no dia), joga para a próxima fatura
      if (txDate.getDate() >= closingDay) {
          referenceClosingDate = addMonths(referenceClosingDate, 1);
      }

      // 3. A data de vencimento é baseada no mês dessa fatura de referência
      let dueDate = new Date(referenceClosingDate.getFullYear(), referenceClosingDate.getMonth(), dueDay);
      
      // Ajuste fino: Se o dia de vencimento for antes do fechamento (ex: fecha dia 25, vence dia 5),
      // o vencimento é no mês seguinte ao fechamento.
      if (dueDate <= referenceClosingDate) {
          dueDate = addMonths(dueDate, 1);
      }

      // Agora agrupamos pela DATA DE VENCIMENTO CALCULADA, não pela data da compra
      const key = format(dueDate, 'MMM/yy', { locale: ptBR }).toUpperCase();
      const cardName = t.creditCard.name;
      cardSet.add(cardName);

      // Só adiciona se estiver dentro do intervalo de visualização (12 meses)
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