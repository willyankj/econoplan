'use server';

import { prisma } from "@/lib/prisma";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import {
    format, subMonths,
    differenceInCalendarMonths, isBefore, addMonths, addWeeks, addYears,
    formatMonthYear, formatMonthShort, getMonthKey
} from "@/lib/date-utils";
import { startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toDecimal, TRANSACTION_TYPES } from "@/lib/finance-utils";

// ============================================================================
// HELPERS
// ============================================================================
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

// ============================================================================
// 1. DASHBOARD OVERVIEW (VISÃO GERAL DO USUÁRIO)
// ============================================================================
export async function getDashboardOverviewData(params: { month?: string, from?: string, to?: string }) {
    const { user } = await validateUser();
    if (!user) throw new Error("Unauthorized");
    const workspaceId = await getActiveWorkspaceId(user);

    const globalDates = getDatesFromParams(params.from, params.to, params.month);

    // 1. SALDO TOTAL (Considerando todas as contas do workspace)
    const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
    const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    // 2. TOTAIS MENSAIS (Agregação no período selecionado)
    const incomeAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { workspaceId, type: 'INCOME', creditCardId: null, date: { gte: globalDates.startDate, lte: globalDates.endDate } }
    });
    const expenseAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { workspaceId, type: 'EXPENSE', creditCardId: null, date: { gte: globalDates.startDate, lte: globalDates.endDate } }
    });

    // 3. DADOS DO GRÁFICO (Com Saldo Dia/Mês)
    const chartTransactions = await prisma.transaction.findMany({
        where: { workspaceId, creditCardId: null, date: { gte: globalDates.startDate, lte: globalDates.endDate } },
        select: { date: true, amount: true, type: true },
        orderBy: { date: 'asc' }
    });

    const diffDays = Math.ceil(Math.abs(globalDates.endDate.getTime() - globalDates.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isDailyChart = diffDays <= 35;
    const chartMap = new Map();

    // Inicializa o mapa com datas zeradas
    if (isDailyChart) {
        for (let d = new Date(globalDates.startDate); d <= globalDates.endDate; d.setDate(d.getDate() + 1)) {
            const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            chartMap.set(key, { name: key, income: 0, expense: 0, balance: 0 });
        }
    } else {
        let d = new Date(globalDates.startDate);
        while (d <= globalDates.endDate) {
            const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const formattedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
            if (!chartMap.has(formattedKey)) chartMap.set(formattedKey, { name: formattedKey, income: 0, expense: 0, balance: 0 });
            d.setMonth(d.getMonth() + 1); d.setDate(1);
        }
    }

    // Preenche com transações
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
         else if (t.type === 'EXPENSE') entry.expense += val;
      }
    });

    // 3.1 CÁLCULO DE SALDO ACUMULADO (RUNNING BALANCE)
    // 1. Pega saldo atual (Total Balance)
    // 2. Desconta transações futuras (Entre o fim do gráfico e hoje) para chegar no saldo FINAL do gráfico.
    // 3. Itera de trás para frente no gráfico para distribuir o saldo.

    const today = new Date();
    let endOfChartBalance = totalBalance;

    // Se o gráfico termina no passado (antes de hoje), precisamos ajustar o saldo
    if (globalDates.endDate < today) {
        const gapTransactions = await prisma.transaction.findMany({
            where: {
                workspaceId,
                date: { gt: globalDates.endDate, lte: today },
                creditCardId: null // Apenas saldo de contas
            },
            select: { amount: true, type: true }
        });

        const gapNet = gapTransactions.reduce((acc, t) => {
            const val = toDecimal(t.amount);
            if (t.type === 'INCOME') return acc + val;
            if (t.type === 'EXPENSE') return acc - val;
            return acc;
        }, 0);

        // Saldo Final do Gráfico = Saldo Atual - (Receita Gap - Despesa Gap)
        endOfChartBalance = totalBalance - gapNet;
    }

    // Converter Map para Array ordenado para iteração
    const chartArray = Array.from(chartMap.values());
    let runningBalance = endOfChartBalance;

    // Iterar de trás para frente
    for (let i = chartArray.length - 1; i >= 0; i--) {
        const entry = chartArray[i];

        // O saldo plotado no ponto "i" é o saldo ao FINAL daquele dia/mês.
        entry.balance = runningBalance;

        // Para a próxima iteração (dia anterior), removemos o efeito do dia atual.
        // Saldo(Ontem) = Saldo(Hoje) - Receita(Hoje) + Despesa(Hoje)
        const netChange = entry.income - entry.expense;
        runningBalance = runningBalance - netChange;
    }

    // 4. ORÇAMENTOS
    const budgets = await prisma.budget.findMany({ where: { workspaceId }, include: { category: true } });

    const expensesByCategory = await prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { workspaceId, type: 'EXPENSE', categoryId: { not: null }, date: { gte: globalDates.startDate, lte: globalDates.endDate } }
    });

    const expMap = new Map();
    expensesByCategory.forEach(e => { if(e.categoryId) expMap.set(e.categoryId, toDecimal(e._sum.amount)); });

    const budgetList = budgets.map(b => ({
        id: b.id, categoryName: b.category?.name || 'Geral', target: Number(b.targetAmount),
        spent: expMap.get(b.categoryId) || 0
    }));

    // 5. METAS
    const rawGoals = await prisma.goal.findMany({ where: { workspaceId }, orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }], take: 3 });
    const goals = rawGoals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) }));

    return {
      totalBalance,
      monthlyIncome: toDecimal(incomeAgg._sum.amount),
      monthlyExpense: toDecimal(expenseAgg._sum.amount),
      chartData: chartArray,
      lastTransactions: [],
      budgets: budgetList,
      goals,
      accounts
    };
}

// ============================================================================
// 2. ORÁCULO FINANCEIRO (FLUXO DE CAIXA PROJETADO)
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

  // 1. Saldo Inicial (Todas as Contas)
  const accounts = await prisma.bankAccount.findMany({
    where: { workspace: workspaceFilter }
  });
  let currentBalance = accounts.reduce((acc, cur) => acc + toDecimal(cur.balance), 0);

  // 2. Transações Futuras (Reais, já lançadas)
  const futureTransactions = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      date: { gt: today, lte: projectUntil }
    }
  });

  // 3. Definições de Recorrência
  const recurringDefs = await prisma.transaction.findMany({
    where: {
      workspace: workspaceFilter,
      isRecurring: true,
      nextRecurringDate: { not: null }
    }
  });

  // Mapa de Projeção (Income/Expense previstos via recorrência)
  const projectionMap = new Map<string, { income: number, expense: number }>();

  recurringDefs.forEach(def => {
      let pointer = new Date(def.nextRecurringDate!);
      
      while (pointer <= projectUntil) {
          const key = getMonthKey(pointer);
          
          if (!projectionMap.has(key)) projectionMap.set(key, { income: 0, expense: 0 });
          const entry = projectionMap.get(key)!;

          // Lógica de Projeção:
          // INCOME -> Soma em Income
          // EXPENSE -> Soma em Expense
          // VAULT_DEPOSIT -> Soma em Expense (sai do caixa operacional)
          // VAULT_WITHDRAW -> Soma em Income (entra no caixa operacional)
          // TRANSFER -> Ignora (neutro globalmente)

          if (def.type === 'INCOME' || def.type === 'VAULT_WITHDRAW') {
              entry.income += toDecimal(def.amount);
          } else if (def.type === 'EXPENSE' || def.type === 'VAULT_DEPOSIT') {
              entry.expense += toDecimal(def.amount);
          }

          // Avança pointer
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
    const monthLabel = formatMonthShort(currentDate);
    const monthKey = getMonthKey(currentDate);

    // Transações REAIS (lançadas no futuro)
    const monthRealTx = futureTransactions.filter(t => t.date >= monthStart && t.date <= monthEnd);

    // Filtra e Soma Reais
    const incomeReal = monthRealTx
        .filter(t => t.type === 'INCOME' || t.type === 'VAULT_WITHDRAW')
        .reduce((sum, t) => sum + toDecimal(t.amount), 0);

    const expenseReal = monthRealTx
        .filter(t => t.type === 'EXPENSE' || t.type === 'VAULT_DEPOSIT')
        .reduce((sum, t) => sum + toDecimal(t.amount), 0);

    // Dados Projetados (Recorrência)
    const projected = projectionMap.get(monthKey) || { income: 0, expense: 0 };

    // Totalização
    const totalIncome = incomeReal + projected.income;
    const totalExpense = expenseReal + projected.expense;
    const netChange = totalIncome - totalExpense;
    
    // Atualiza saldo acumulado
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
// 3. RAIO-X DE ENDIVIDAMENTO
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
        const key = formatMonthYear(d); // Ex: JAN/24
        monthsMap.set(key, { name: key, total: 0 }); 
    }
  
    cardTransactions.forEach(t => {
        if (!t.creditCard) return;
  
        const txDate = new Date(t.date);
        const closingDay = t.creditCard.closingDay;
        const dueDay = t.creditCard.dueDay;
  
        // Lógica simplificada de vencimento
        let referenceClosingDate = new Date(txDate.getFullYear(), txDate.getMonth(), closingDay);
        if (txDate.getDate() >= closingDay) {
            referenceClosingDate = addMonths(referenceClosingDate, 1);
        }
  
        let dueDate = new Date(referenceClosingDate.getFullYear(), referenceClosingDate.getMonth(), dueDay);
        if (dueDate <= referenceClosingDate) {
            dueDate = addMonths(dueDate, 1);
        }
  
        const key = formatMonthYear(dueDate);
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
// 4. COMPARATIVO MÊS A MÊS
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
            type: 'EXPENSE', // Apenas despesas reais para comparação
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
// 5. ÍNDICE DE SAÚDE FINANCEIRA
// ============================================================================
export async function getTenantHealthScore(filterWorkspaceId?: string) {
    const { user } = await validateUser('org_view');
    if (!user) return { score: 0, metrics: {} };

    const today = new Date();
    const start = subMonths(today, 1); // Analisa últimos 30 dias (aprox)

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

    // --- CORREÇÃO DE CONCEITO ---
    // Income: Receita Operacional (Salário, Vendas)
    // Expense: Despesa Operacional (Contas, Compras)
    // Investment: Aportes em Cofrinhos (Poupança)
    // Ignore: Transferências internas

    const totalIncome = transactions
        .filter(t => t.type === TRANSACTION_TYPES.INCOME)
        .reduce((acc, t) => acc + toDecimal(t.amount), 0);

    const totalExpense = transactions
        .filter(t => t.type === TRANSACTION_TYPES.EXPENSE)
        .reduce((acc, t) => acc + toDecimal(t.amount), 0);

    const totalSavings = transactions
        .filter(t => t.type === TRANSACTION_TYPES.VAULT_DEPOSIT)
        .reduce((acc, t) => acc + toDecimal(t.amount), 0);

    const totalBalance = accounts.reduce((acc, a) => acc + toDecimal(a.balance), 0);

    // Savings Rate = (Receita - Despesa) / Receita.
    // Se houve aporte, o dinheiro "sobrou" da despesa, então a conta (Income - Expense) já inclui o que foi poupado?
    // Ex: Ganhei 100. Gastei 60. Sobrou 40. Desses 40, botei 30 no cofrinho.
    // Income=100, Expense=60. (Net=40). SavingsRate = 40%.
    // O aporte de 30 é apenas uma alocação do Net.
    // Portanto, NÃO devemos somar o Aporte como Despesa. E a fórmula (Inc-Exp)/Inc está correta.
    // O Aporte serve para validar se o usuário está REALMENTE poupando, mas matematicamente a taxa de poupança potencial é Inc - Exp.

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    let savingsScore = 0;
    if (savingsRate >= 20) savingsScore = 40;
    else if (savingsRate > 0) savingsScore = savingsRate * 2;
    else savingsScore = 0;

    // Se o usuário fez aportes explícitos, damos um bônus se a savingsRate calculada não for alta o suficiente?
    // Por enquanto manteremos a lógica simples: Receita - Despesa = Capacidade de Poupança.

    const monthlyAvgExpense = totalExpense || 1; 
    const coverageMonths = totalBalance / monthlyAvgExpense;
    let coverageScore = 0;
    if (coverageMonths >= 3) coverageScore = 40; // 3 meses de reserva de emergência
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
// 6. ANALYTICS GERAL DO TENANT
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

    const chartDataMap = new Map();
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;
    let totalInvestment = 0;

    data.forEach(t => {
        const day = format(t.date, 'dd/MM');

        if (!chartDataMap.has(day)) {
            chartDataMap.set(day, { name: day, income: 0, expense: 0, transfer: 0, investment: 0 });
        }
        const entry = chartDataMap.get(day);
        const val = Number(t.amount);

        // Agregação Correta por Tipo
        if (t.type === TRANSACTION_TYPES.INCOME) {
            entry.income += val;
            totalIncome += val;
        } else if (t.type === TRANSACTION_TYPES.EXPENSE) {
            entry.expense += val;
            totalExpense += val;
        } else if (t.type === TRANSACTION_TYPES.TRANSFER) {
            entry.transfer += val;
            totalTransfer += val;
        } else if (t.type === TRANSACTION_TYPES.VAULT_DEPOSIT || t.type === TRANSACTION_TYPES.VAULT_WITHDRAW) {
            // Investment: Consideramos o volume movimentado (valor absoluto) ou apenas aportes?
            // Geralmente em gráficos de barras queremos ver o VOLUME.
            entry.investment += val;
            totalInvestment += val;
        }
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