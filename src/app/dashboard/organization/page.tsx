import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; 
import { Building2, TrendingUp, TrendingDown, Target, PieChart, DollarSign } from "lucide-react";
import { GoalModal } from "@/components/dashboard/goals/goal-modal";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { checkPermission } from "@/lib/permissions";
import { TenantOverviewCharts } from "@/components/dashboard/organization/tenant-overview-charts";
import { TenantRecentTransactions } from "@/components/dashboard/organization/tenant-recent-transactions";
import { DateMonthSelector } from "@/components/dashboard/date-month-selector";
import { OrgFilters } from "@/components/dashboard/organization/org-filters";
import { GoalAnalytics } from "@/components/dashboard/organization/goal-analytics"; 
import { formatCurrency } from "@/lib/utils";
import { InfoHelp } from "@/components/dashboard/info-help"; 
import { getTenantOracleData, getTenantDebtXRayData, getTenantHealthScore } from "@/app/dashboard/actions/analytics";
import { FinancialOracle } from "@/components/dashboard/analytics/financial-oracle";
import { DebtXRay } from "@/components/dashboard/analytics/debt-xray";
import { HealthScore } from "@/components/dashboard/analytics/health-score";

const toDecimal = (val: any) => Number(val) || 0;

export default async function OrganizationPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string, from?: string, to?: string, filterWorkspace?: string, filterType?: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  if (!user) return <div>Erro.</div>;
  const hasAccess = checkPermission(user.role, user.tenant.settings, 'org_view');
  if (!hasAccess) redirect("/dashboard");
  const tenantId = user.tenantId;
  const params = await searchParams;

  const now = new Date();
  let startDate, endDate;
  if (params.from && params.to) { 
      startDate = new Date(params.from+"T00:00:00"); 
      endDate = new Date(params.to+"T23:59:59"); 
  } else { 
      let d = now; 
      if(params.month) { const [y,m] = params.month.split('-'); d = new Date(parseInt(y), parseInt(m)-1, 1); }
      startDate = new Date(d.getFullYear(), d.getMonth(), 1); 
      endDate = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59);
  }

  const filterWorkspaceId = params.filterWorkspace && params.filterWorkspace !== 'ALL' ? params.filterWorkspace : undefined;
  const filterType = params.filterType && params.filterType !== 'ALL' ? params.filterType : undefined;

  // --- FILTROS DE QUERY ---
  const baseWhere = {
      tenantId,
      ...(filterWorkspaceId && { id: filterWorkspaceId })
  };
  
  const txWhere = {
      workspace: { tenantId, ...(filterWorkspaceId && { id: filterWorkspaceId }) },
      date: { gte: startDate, lte: endDate },
      ...(filterType && { type: filterType as any })
  };

  // 1. KPIS (Agregados no Banco - Leve)
  const accounts = await prisma.bankAccount.findMany({ where: { workspace: baseWhere } });
  const totalBalance = accounts.reduce((acc, a) => acc + toDecimal(a.balance), 0);

  const incomeAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...txWhere, type: 'INCOME', creditCardId: null } });
  const expenseAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...txWhere, type: 'EXPENSE', creditCardId: null } });
  
  const totalIncome = toDecimal(incomeAgg._sum.amount);
  const totalExpense = toDecimal(expenseAgg._sum.amount);

  // 2. DADOS PARA GRÁFICOS (Agregados por Grupo)
  const workspacesList = await prisma.workspace.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const workspaceMap = new Map(workspacesList.map(w => [w.id, w.name]));

  const byWorkspace = await prisma.transaction.groupBy({
      by: ['workspaceId', 'type'],
      _sum: { amount: true },
      where: { ...txWhere, creditCardId: null }
  });

  const workspaceChartData: any[] = [];
  // Processa o agrupamento para formato do gráfico
  const wsDataMap = new Map();
  byWorkspace.forEach(item => {
      const wsName = workspaceMap.get(item.workspaceId) || 'Unknown';
      if (!wsDataMap.has(wsName)) wsDataMap.set(wsName, { name: wsName, income: 0, expense: 0 });
      const val = toDecimal(item._sum.amount);
      if (item.type === 'INCOME') wsDataMap.get(wsName).income += val;
      else wsDataMap.get(wsName).expense += val;
  });
  workspaceChartData.push(...Array.from(wsDataMap.values()));

  // Categorias (Top 5)
  const byCategory = await prisma.transaction.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: { ...txWhere, type: 'EXPENSE', creditCardId: null, categoryId: { not: null } },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
  });

  // Busca nomes das categorias (apenas as 5 usadas)
  const catIds = byCategory.map(c => c.categoryId).filter(Boolean) as string[];
  const categories = await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } });
  const catNameMap = new Map(categories.map(c => [c.id, c.name]));

  const categoryChartData = byCategory.map(c => ({
      name: catNameMap.get(c.categoryId!) || 'Outros',
      value: toDecimal(c._sum.amount)
  }));

  // 3. WIDGETS E LISTAS
  const oracleData = await getTenantOracleData(filterWorkspaceId, { from: startDate, to: endDate });
  const debtData = await getTenantDebtXRayData(filterWorkspaceId);
  const healthData = await getTenantHealthScore(filterWorkspaceId);

  const recentTransactions = await prisma.transaction.findMany({
    where: txWhere,
    orderBy: { date: 'desc' }, 
    take: 20, 
    include: { workspace: true, category: true }
  });

  const sharedGoals = await prisma.goal.findMany({ where: { tenantId }, include: { transactions: true }, orderBy: { createdAt: 'desc' } });
  const goalsWithDetails = sharedGoals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount), transactions: g.transactions.map(t => ({...t, amount: Number(t.amount)})) }));
  
  const userWorkspaces = await prisma.workspaceMember.findMany({ where: { userId: user.id }, include: { workspace: { include: { bankAccounts: true } } } });
  const allUserAccounts = userWorkspaces.flatMap(wm => wm.workspace.bankAccounts.map(acc => ({...acc, balance: Number(acc.balance), workspaceName: wm.workspace.name})));
  
  const transactionsForTable = recentTransactions.map(t => ({ id: t.id, description: t.description, amount: Number(t.amount), type: t.type, date: t.date, workspace: { name: t.workspace.name }, category: t.category ? { name: t.category.name } : null }));

  return (
    <div className="space-y-8">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Visão Geral: {user.tenant.name}
            </h2>
            <p className="text-muted-foreground">Gestão centralizada da organização.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <DateMonthSelector />
            <OrgFilters workspaces={workspacesList} />
        </div>
      </div>

      {/* 1. KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio</CardTitle>
                    <InfoHelp title="Patrimônio Total">Soma de todos os saldos bancários de todos os workspaces da organização.</InfoHelp>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg"><DollarSign className="w-4 h-4 text-blue-500" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(totalBalance)}</div>
            </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Receita</CardTitle>
                    <InfoHelp title="Receita do Período">Total de entradas efetivadas neste mês em todos os workspaces.</InfoHelp>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</div>
            </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Despesa</CardTitle>
                    <InfoHelp title="Despesa do Período">Total de saídas e gastos neste mês em todos os workspaces.</InfoHelp>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-lg"><TrendingDown className="w-4 h-4 text-rose-500" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-rose-500">{formatCurrency(totalExpense)}</div>
            </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                    <InfoHelp title="Fluxo Líquido">Resultado de (Receitas - Despesas) apenas dentro do período selecionado.</InfoHelp>
                </div>
                <div className="p-2 bg-cyan-500/10 rounded-lg"><PieChart className="w-4 h-4 text-cyan-500" /></div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                    {formatCurrency(totalIncome - totalExpense)}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 2. INTELIGÊNCIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
              <HealthScore score={healthData.score} metrics={healthData.metrics} />
          </div>
          <div className="lg:col-span-2">
              <FinancialOracle data={oracleData.balanceData} />
          </div>
      </div>

      {/* 3. DETALHAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <DebtXRay data={debtData.chartData} cardNames={debtData.cardNames} />
           <TenantOverviewCharts workspaceData={workspaceChartData} categoryData={categoryChartData} />
      </div>

      {/* 4. TABELA RECENTE */}
      <TenantRecentTransactions transactions={transactionsForTable} />

      {/* 5. METAS */}
      <div className="space-y-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Metas da Organização
                </h3>
                <p className="text-sm text-muted-foreground">Acompanhamento detalhado de contribuições.</p>
            </div>
            <GoalModal isShared={true} workspaces={workspacesList} />
        </div>

        {goalsWithDetails.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                <Target className="w-10 h-10 mb-3 opacity-50" />
                <p>Nenhuma meta compartilhada.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {goalsWithDetails.map(goal => (
                    <Card key={goal.id} className="bg-card border-border shadow-sm overflow-hidden flex flex-col">
                        <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                                    <CardDescription>Meta Global: {formatCurrency(goal.targetAmount)}</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <GoalModal goal={goal} isShared={true} workspaces={workspacesList} />
                                    <DepositGoalModal 
                                        goal={goal} 
                                        accounts={allUserAccounts} 
                                        type="DEPOSIT" 
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 flex-1">
                            <GoalAnalytics goal={goal} workspaces={workspacesList} />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}