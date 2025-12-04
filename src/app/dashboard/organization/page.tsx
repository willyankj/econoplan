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
import { OrgFilters } from "@/components/dashboard/organization/org-filters";
import { GoalAnalytics } from "@/components/dashboard/organization/goal-analytics"; 
import { formatCurrency } from "@/lib/utils";
import { InfoHelp } from "@/components/dashboard/info-help"; 
import { 
    getTenantOracleData, 
    getTenantDebtXRayData, 
    getTenantHealthScore,
    getTenantAnalytics // <--- Importando a função correta
} from "@/app/dashboard/actions/analytics";
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

  // Tratamento de filtros para evitar strings "undefined"
  // CORREÇÃO: Usando chaves padronizadas (workspaceId, type) compatíveis com o novo DataFilter
  const filterWorkspaceId = (params.workspaceId && params.workspaceId !== 'ALL') ? params.workspaceId : (params.filterWorkspace && params.filterWorkspace !== 'ALL' ? params.filterWorkspace : undefined);
  const filterType = (params.type && params.type !== 'ALL') ? params.type : (params.filterType && params.filterType !== 'ALL' ? params.filterType : undefined);

  // 1. DADOS DE ANALYTICS (GRÁFICOS E TOTAIS)
  // Substitui a lógica manual anterior pela chamada da função dedicada
  const analyticsData = await getTenantAnalytics(
      'custom', // Período customizado (controlado pelas datas)
      filterType || 'all', 
      filterWorkspaceId || 'all'
  );

  // 2. KPIS GERAIS (Patrimônio Total independente de filtro de data, para contexto)
  const baseWhere = {
      tenantId,
      ...(filterWorkspaceId && { id: filterWorkspaceId })
  };
  const accounts = await prisma.bankAccount.findMany({ where: { workspace: baseWhere } });
  const totalBalance = accounts.reduce((acc, a) => acc + toDecimal(a.balance), 0);

  // Recalcula Saldo do Período (Receita - Despesa do filtro atual)
  const periodBalance = analyticsData.totals.income - analyticsData.totals.expense;

  // 3. WIDGETS EXTRAS
  const workspacesList = await prisma.workspace.findMany({ where: { tenantId }, select: { id: true, name: true } });
  
  const oracleData = await getTenantOracleData(filterWorkspaceId, { from: startDate, to: endDate });
  const debtData = await getTenantDebtXRayData(filterWorkspaceId);
  const healthData = await getTenantHealthScore(filterWorkspaceId);

  // 4. TABELA RECENTE
  // Query manual apenas para a lista detalhada, respeitando filtros
  const txWhere: any = {
      workspace: { tenantId, ...(filterWorkspaceId && { id: filterWorkspaceId }) },
      date: { gte: startDate, lte: endDate },
  };
  if (filterType) {
      if (filterType === 'INVESTMENT') txWhere.type = { in: ['VAULT_DEPOSIT', 'VAULT_WITHDRAW'] };
      else txWhere.type = filterType;
  }

  const recentTransactions = await prisma.transaction.findMany({
    where: txWhere,
    orderBy: { date: 'desc' }, 
    take: 20, 
    include: { workspace: true, category: true }
  });

  const transactionsForTable = recentTransactions.map(t => ({ 
      id: t.id, 
      description: t.description, 
      amount: Number(t.amount), 
      type: t.type, 
      date: t.date, 
      workspace: { name: t.workspace.name }, 
      category: t.category ? { name: t.category.name } : null 
  }));

  // 5. METAS
  const sharedGoals = await prisma.goal.findMany({ where: { tenantId }, include: { transactions: true, vaults: {include: {bankAccount: true}} }, orderBy: { createdAt: 'desc' } });
  
  const goalsWithDetails = sharedGoals.map(g => {
      const currentAmount = g.vaults.reduce((acc, v) => acc + Number(v.balance), 0);
      return { 
          ...g, 
          targetAmount: Number(g.targetAmount), 
          currentAmount: currentAmount, 
          transactions: g.transactions.map(t => ({...t, amount: Number(t.amount)})) 
      };
  });
  
  const userWorkspaces = await prisma.workspaceMember.findMany({ where: { userId: user.id }, include: { workspace: { include: { bankAccounts: { include: { vaults: true } } } } } });
  const allUserAccounts = userWorkspaces.flatMap(wm => wm.workspace.bankAccounts.map(acc => ({
      ...acc, 
      balance: Number(acc.balance), 
      vaults: acc.vaults.map(v => ({...v, balance: Number(v.balance)})),
      workspaceName: wm.workspace.name
  })));

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
            <OrgFilters workspaces={workspacesList} />
        </div>
      </div>

      {/* 1. KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio</CardTitle>
                    <InfoHelp title="Patrimônio Total">Soma de todos os saldos bancários.</InfoHelp>
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
                    <InfoHelp title="Receita do Período">Total de entradas no período filtrado.</InfoHelp>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{formatCurrency(analyticsData.totals.income)}</div>
            </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Despesa</CardTitle>
                    <InfoHelp title="Despesa do Período">Total de saídas no período filtrado.</InfoHelp>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-lg"><TrendingDown className="w-4 h-4 text-rose-500" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-rose-500">{formatCurrency(analyticsData.totals.expense)}</div>
            </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                    <InfoHelp title="Fluxo Líquido">Resultado do período (Receita - Despesa).</InfoHelp>
                </div>
                <div className="p-2 bg-cyan-500/10 rounded-lg"><PieChart className="w-4 h-4 text-cyan-500" /></div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${periodBalance >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                    {formatCurrency(periodBalance)}
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

      {/* 3. DETALHAMENTO - PASSANDO OS DADOS CORRETOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <DebtXRay data={debtData.chartData} cardNames={debtData.cardNames} />
           <TenantOverviewCharts data={analyticsData} /> {/* <-- CORREÇÃO AQUI */}
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
            <GoalModal isShared={true} workspaces={workspacesList} accounts={allUserAccounts} />
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
                                    <GoalModal goal={goal} isShared={true} workspaces={workspacesList} accounts={allUserAccounts} />
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