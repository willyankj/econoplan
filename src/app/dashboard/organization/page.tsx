import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
// CORREÇÃO: Adicionado CardDescription na importação abaixo
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, TrendingUp, TrendingDown, Target, Users, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { NewSharedGoalModal } from "@/components/dashboard/organization/new-shared-goal-modal";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { checkPermission } from "@/lib/permissions";
import { TenantOverviewCharts } from "@/components/dashboard/organization/tenant-overview-charts";
import { TenantRecentTransactions } from "@/components/dashboard/organization/tenant-recent-transactions";
import { DateMonthSelector } from "@/components/dashboard/date-month-selector";
import { OrgFilters } from "@/components/dashboard/organization/org-filters";

export default async function OrganizationPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string, filterWorkspace?: string, filterType?: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user) return <div>Erro.</div>;

  const hasAccess = checkPermission(user.role, user.tenant.settings, 'canViewOrganization');
  if (!hasAccess) redirect("/dashboard");

  const tenantId = user.tenantId;
  const params = await searchParams;

  // --- FILTROS DE DATA E CONTEXTO ---
  const now = new Date();
  let dateFilter = now;
  
  if (params.month) {
    const [y, m] = params.month.split('-');
    dateFilter = new Date(parseInt(y), parseInt(m) - 1, 1);
  }

  const firstDay = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), 1);
  const lastDay = new Date(dateFilter.getFullYear(), dateFilter.getMonth() + 1, 0);

  const filterWorkspaceId = params.filterWorkspace && params.filterWorkspace !== 'ALL' ? params.filterWorkspace : undefined;
  const filterType = params.filterType && params.filterType !== 'ALL' ? params.filterType : undefined;

  // 1. BUSCA WORKSPACES
  const workspaces = await prisma.workspace.findMany({
    where: { 
        tenantId,
        ...(filterWorkspaceId && { id: filterWorkspaceId }) 
    },
    include: {
      bankAccounts: true,
      transactions: {
        where: { 
            date: { gte: firstDay, lte: lastDay },
            ...(filterType && { type: filterType as any })
        },
        include: { category: true }
      }
    }
  });

  const allWorkspaces = await prisma.workspace.findMany({
      where: { tenantId },
      select: { id: true, name: true }
  });

  // 2. BUSCA TRANSAÇÕES RECENTES
  const recentTransactions = await prisma.transaction.findMany({
    where: { 
        workspace: { 
            tenantId,
            ...(filterWorkspaceId && { id: filterWorkspaceId }) 
        },
        date: { gte: firstDay, lte: lastDay },
        ...(filterType && { type: filterType as any })
    },
    orderBy: { date: 'desc' },
    take: 20,
    include: { workspace: true, category: true }
  });

  // --- AGREGAÇÃO DE DADOS ---
  let totalBalance = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  
  const workspaceChartData: any[] = [];
  const categoryMap = new Map<string, number>();

  workspaces.forEach(ws => {
    let wsBalance = 0;
    ws.bankAccounts.forEach(acc => wsBalance += Number(acc.balance));
    totalBalance += wsBalance;

    let wsIncome = 0;
    let wsExpense = 0;

    ws.transactions.forEach(t => {
      const val = Number(t.amount);
      
      if (t.type === 'INCOME' && !t.creditCardId) {
          totalIncome += val;
          wsIncome += val;
      }
      if (t.type === 'EXPENSE' && !t.creditCardId) {
          totalExpense += val;
          wsExpense += val;

          if (t.category) {
            const current = categoryMap.get(t.category.name) || 0;
            categoryMap.set(t.category.name, current + val);
          }
      }
    });

    workspaceChartData.push({
        name: ws.name,
        income: wsIncome,
        expense: wsExpense
    });
  });

  const categoryChartData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

  // 3. METAS
  const sharedGoals = await prisma.goal.findMany({
    where: { tenantId },
    include: { transactions: true },
    orderBy: { createdAt: 'desc' }
  });

  const userWorkspaces = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: { include: { bankAccounts: true } } }
  });
  
  const allUserAccounts = userWorkspaces.flatMap(wm => 
    wm.workspace.bankAccounts.map(acc => ({...acc, balance: Number(acc.balance), workspaceName: wm.workspace.name}))
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const transactionsForTable = recentTransactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: t.date,
      workspace: { name: t.workspace.name },
      category: t.category ? { name: t.category.name } : null
  }));

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
            <OrgFilters workspaces={allWorkspaces} />
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Total</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(totalBalance)}</div>
                <p className="text-xs text-muted-foreground mt-1">Saldo global acumulado</p>
            </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                    Receita
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground mt-1">Neste período</p>
            </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                    Despesa
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-rose-500">{formatCurrency(totalExpense)}</div>
                <p className="text-xs text-muted-foreground mt-1">Neste período</p>
            </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                    Saldo do Período
                    <PieChart className="w-4 h-4 text-blue-500" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                    {formatCurrency(totalIncome - totalExpense)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Fluxo de caixa</p>
            </CardContent>
        </Card>
      </div>

      {/* GRÁFICOS E EXTRATO */}
      <TenantOverviewCharts workspaceData={workspaceChartData} categoryData={categoryChartData} />

      <TenantRecentTransactions transactions={transactionsForTable} />

      {/* METAS */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Metas Compartilhadas
            </h3>
            <NewSharedGoalModal />
        </div>

        {sharedGoals.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                <Target className="w-10 h-10 mb-3 opacity-50" />
                <p>Nenhuma meta compartilhada.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sharedGoals.map(goal => {
                    const target = Number(goal.targetAmount);
                    const current = Number(goal.currentAmount);
                    const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;

                    return (
                        <Card key={goal.id} className="bg-card border-border shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-start">
                                    <span>{goal.name}</span>
                                    <span className="text-[10px] font-normal bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-wide">
                                        Conjunta
                                    </span>
                                </CardTitle>
                                <CardDescription>Meta: {formatCurrency(target)}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-foreground font-bold">{formatCurrency(current)}</span>
                                        <span className="text-muted-foreground">{percent.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={percent} className="h-2 bg-secondary" />
                                </div>
                                
                                <div className="flex gap-2 pt-2">
                                    <div className="flex-1">
                                        <DepositGoalModal 
                                            goal={{ ...goal, targetAmount: Number(goal.targetAmount), currentAmount: Number(goal.currentAmount) }} 
                                            accounts={allUserAccounts} 
                                            type="DEPOSIT" 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        )}
      </div>
    </div>
  );
}