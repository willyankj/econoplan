import { getUserWorkspace } from "@/lib/get-user-workspace";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Trophy, Users, Trash2, Calendar, Clock, TrendingDown } from "lucide-react";
import { GoalModal } from "@/components/dashboard/goals/goal-modal";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { redirect } from "next/navigation";
import { deleteGoal } from "@/app/dashboard/actions";
import { GoalInfoDialog } from "@/components/dashboard/goals/goal-info-dialog";
import { differenceInDays, differenceInMonths, addMonths } from "date-fns";

export default async function GoalsPage() {
  const { user, workspaceId } = await getUserWorkspace();
  
  if (!user || !workspaceId) {
    redirect("/login");
  }

  const isOwner = user.role === 'OWNER';

  const workspaces = await prisma.workspace.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true }
  });

  const goalsRaw = await prisma.goal.findMany({
    where: {
      OR: [
        { workspaceId: workspaceId },
        { tenantId: user.tenantId, workspaceId: null }
      ]
    },
    include: { 
        transactions: {
            select: { amount: true, date: true, type: true, workspaceId: true },
            orderBy: { date: 'desc' }
        } 
    },
    orderBy: { deadline: 'asc' }
  });

  const goals = goalsRaw.map(g => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    transactions: g.transactions.map(t => ({...t, amount: Number(t.amount)}))
  }));

  // --- CORREÇÃO 1: BUSCAR OS COFRINHOS (VAULTS) DENTRO DAS CONTAS ---
  const accountsRaw = await prisma.bankAccount.findMany({
    where: { workspaceId },
    select: { 
        id: true, 
        name: true, 
        bank: true, 
        balance: true, 
        vaults: true, // <--- Importante para o modal identificar os cofrinhos
        workspace: { select: { name: true } } 
    }
  });
  
  const accounts = accountsRaw.map(a => ({
      ...a, 
      balance: Number(a.balance), 
      // Mapeia também o saldo dos vaults para número, se necessário
      vaults: a.vaults.map(v => ({...v, balance: Number(v.balance)})),
      workspaceName: a.workspace.name
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Metas & Objetivos</h2>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e mantenha o foco.
          </p>
        </div>
        <div className="flex gap-2">
            <GoalModal accounts={accounts} /> 
            {isOwner && (
                <GoalModal isShared={true} workspaces={workspaces} />
            )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
            const current = goal.currentAmount;
            const target = goal.targetAmount;
            const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const isCompleted = progress >= 100;
            
            const today = new Date();
            const createdAt = new Date(goal.createdAt);
            const deadline = goal.deadline ? new Date(goal.deadline) : null;
            const daysLeft = deadline ? differenceInDays(deadline, today) : null;
            const amountLeft = Math.max(0, target - current);
            const monthsSinceStart = Math.max(1, differenceInMonths(today, createdAt));

            const netSavedFromTransactions = goal.transactions.reduce((acc, t) => {
                if (goal.linkedAccountId) {
                    return acc + (t.type === 'INCOME' ? t.amount : -t.amount);
                } else {
                    return acc + (t.type === 'EXPENSE' ? t.amount : -t.amount);
                }
            }, 0);

            const avgSavedPerMonth = netSavedFromTransactions / monthsSinceStart;

            let monthlyNeeded = 0;
            let projectionDate = null;

            if (deadline && amountLeft > 0) {
                const monthsLeft = Math.max(1, differenceInMonths(deadline, today));
                monthlyNeeded = amountLeft / monthsLeft;
            }

            if (avgSavedPerMonth > 0 && amountLeft > 0) {
                const monthsToFinish = amountLeft / avgSavedPerMonth;
                projectionDate = addMonths(today, Math.ceil(monthsToFinish));
            }

            let healthStatus = "neutral"; 
            if (deadline && amountLeft > 0) {
                if (avgSavedPerMonth >= monthlyNeeded) healthStatus = "healthy";
                else if (avgSavedPerMonth >= monthlyNeeded * 0.8) healthStatus = "warning";
                else healthStatus = "danger";
            } else if (isCompleted) {
                healthStatus = "completed";
            }

            const insights = {
                monthlyNeeded,
                avgSaved: avgSavedPerMonth,
                projectionDate,
                healthStatus,
                daysLeft
            };

            const isShared = !!goal.tenantId;
            let shareInfo = null;
            const rules = goal.contributionRules as Record<string, number> | null;
            let mySharePercentage = 100;

            if (isShared && rules) {
                if (rules[workspaceId] !== undefined) {
                    mySharePercentage = rules[workspaceId];
                } else if (Object.keys(rules).length > 0) {
                     mySharePercentage = 0;
                }
            }

            const mySaved = goal.transactions
                .filter(t => t.workspaceId === workspaceId)
                .reduce((acc, t) => {
                    if (t.type === 'EXPENSE') return acc + t.amount;
                    if (t.type === 'INCOME') return acc - t.amount;
                    return acc;
                }, 0);

            if (isShared && mySharePercentage < 100 && mySharePercentage >= 0) {
                 const myTarget = (target * mySharePercentage) / 100;
                 shareInfo = {
                     percentage: mySharePercentage,
                     target: myTarget,
                     saved: mySaved,
                     totalTarget: target
                 };
            }

            const cardBorderColor = healthStatus === 'completed' ? 'border-emerald-500/50' : (healthStatus === 'danger' ? 'border-rose-500/30' : 'border-border');
            const iconBg = isCompleted ? 'bg-emerald-100 text-emerald-600' : (isShared ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600');
            const icon = isCompleted ? <Trophy className="w-5 h-5" /> : (isShared ? <Users className="w-5 h-5" /> : <Target className="w-5 h-5" />);
            const progressBarColor = isShared ? "[&>div]:bg-purple-500" : (healthStatus === 'danger' ? "[&>div]:bg-rose-500" : "[&>div]:bg-blue-500");

            return (
              <Card key={goal.id} className={`flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden border ${cardBorderColor}`}>
                {isShared && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />}
                
                {/* CORREÇÃO 2: ADICIONADO 'pr-5' PARA EVITAR CORTE */}
                <CardHeader className="pb-3 pl-5 pr-5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 overflow-hidden flex-1">
                      <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold truncate leading-snug" title={goal.name}>
                            {goal.name}
                          </CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        {deadline ? (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {deadline.toLocaleDateString('pt-BR')}
                            </span>
                        ) : (
                            <span className="italic flex items-center gap-1"><Clock className="w-3 h-3" /> Sem prazo</span>
                        )}
                        {!isShared && avgSavedPerMonth < 0 && (
                            <span className="flex items-center gap-1 text-rose-500 font-medium">
                                <TrendingDown className="w-3 h-3" /> Caindo
                            </span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`p-2.5 rounded-xl shrink-0 shadow-sm ${iconBg}`}>
                      {icon}
                    </div>
                  </div>
                </CardHeader>
                
                {/* CORREÇÃO 2: ADICIONADO 'pr-5' PARA EVITAR CORTE DO DELETE */}
                <CardContent className="space-y-5 pt-0 pl-5 pr-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-bold text-foreground tracking-tight">
                            {formatCurrency(current)}
                        </span>
                        <div className="text-right">
                             <span className="text-[10px] text-muted-foreground uppercase block">Meta</span>
                             <span className="text-xs font-medium text-foreground">{formatCurrency(target)}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <Progress value={progress} className={`h-2.5 ${progressBarColor}`} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span>{progress.toFixed(1)}%</span>
                        {amountLeft > 0 ? <span>Faltam {formatCurrency(amountLeft)}</span> : <span className="text-emerald-500 font-bold">Concluído!</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 mt-auto items-center border-t border-border/40">
                    <div className="flex-1">
                        <DepositGoalModal goal={goal} accounts={accounts} type="DEPOSIT" />
                    </div>
                    
                    <GoalInfoDialog goal={goal} myShare={shareInfo} insights={insights} />
                    
                    {(!isShared || isOwner) && (
                        <GoalModal goal={goal} isShared={isShared} workspaces={workspaces} accounts={accounts} />
                    )}
                    
                    {!isShared && (
                        <form action={async () => { 'use server'; await deleteGoal(goal.id); }}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
        })}

        {goals.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted/50 p-6 rounded-full mb-4">
                    <Target className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhum objetivo definido</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                    Comece definindo uma meta financeira, como comprar um carro, fazer uma viagem ou criar sua reserva de emergência.
                </p>
                <GoalModal accounts={accounts} />
            </div>
        )}
      </div>
    </div>
  );
}