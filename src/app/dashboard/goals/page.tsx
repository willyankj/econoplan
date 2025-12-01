import { getUserWorkspace } from "@/lib/get-user-workspace";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Trophy, Users, Trash2, Calendar, Star } from "lucide-react";
import { GoalModal } from "@/components/dashboard/goals/goal-modal";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { redirect } from "next/navigation";
import { deleteGoal } from "@/app/dashboard/actions";
import { GoalInfoDialog } from "@/components/dashboard/goals/goal-info-dialog";

function getDaysRemaining(deadline: Date) {
  const diff = new Date(deadline).getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 3600 * 24));
  return days > 0 ? days : 0;
}

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

  const accountsRaw = await prisma.bankAccount.findMany({
    where: { workspaceId },
    select: { id: true, name: true, bank: true, balance: true, workspace: { select: { name: true } } }
  });
  
  const accounts = accountsRaw.map(a => ({
      ...a, 
      balance: Number(a.balance), 
      workspaceName: a.workspace.name
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Metas & Objetivos</h2>
          <p className="text-muted-foreground">
            Acompanhe o progresso dos seus sonhos financeiros
          </p>
        </div>
        <div className="flex gap-2">
            {/* PASSANDO ACCOUNTS PARA O MODAL */}
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
            const daysLeft = goal.deadline ? getDaysRemaining(goal.deadline) : null;
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

            return (
              <Card key={goal.id} className={`flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden ${isCompleted ? 'border-emerald-500/50 bg-emerald-50/10' : ''} ${isShared ? 'border-purple-500/30' : ''}`}>
                {isShared && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />}
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                          {isShared && <Users className="w-4 h-4 text-purple-500 shrink-0" />}
                          <CardTitle className="text-lg font-semibold truncate leading-snug" title={goal.name}>
                            {goal.name}
                          </CardTitle>
                      </div>
                      
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        {goal.deadline ? (
                            <>
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>{goal.deadline.toLocaleDateString('pt-BR')} ({daysLeft} dias)</span>
                            </>
                        ) : (
                            <span>Sem prazo definido</span>
                        )}
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-600' : (isShared ? 'bg-purple-100 text-purple-600' : 'bg-primary/10 text-primary')}`}>
                      {isCompleted ? <Trophy className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso Global</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className={`h-2 ${isShared ? "[&>div]:bg-purple-500" : ""}`} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(current)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        de {formatCurrency(target)}
                      </span>
                    </div>
                    
                    {shareInfo && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs space-y-1 border border-border">
                            <div className="flex items-center gap-1 text-purple-500 font-medium">
                                <Users className="w-3 h-3" />
                                <span>Sua Participação ({shareInfo.percentage}%)</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Sua Meta:</span>
                                <span>{formatCurrency(shareInfo.target)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Você guardou:</span>
                                <span className={shareInfo.saved >= shareInfo.target ? "text-emerald-500 font-bold" : ""}>
                                    {formatCurrency(shareInfo.saved)}
                                </span>
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 mt-auto items-center">
                    <div className="flex-1">
                        <DepositGoalModal goal={goal} accounts={accounts} type="DEPOSIT" />
                    </div>
                    
                    <GoalInfoDialog goal={goal} myShare={shareInfo} />
                    
                    {(!isShared || isOwner) && (
                        <GoalModal goal={goal} isShared={isShared} workspaces={workspaces} accounts={accounts} />
                    )}
                    
                    {!isShared && (
                        <form action={async () => { 'use server'; await deleteGoal(goal.id); }}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
           <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-2xl bg-muted/20 text-muted-foreground">
              <div className="relative mb-4">
                  <Target className="w-16 h-16 text-muted-foreground/50" />
                  <Star className="w-6 h-6 text-yellow-500 absolute -top-1 -right-2 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Qual é o seu próximo sonho?</h3>
              <p className="text-sm max-w-md text-center mb-8">
                  Crie uma meta pessoal {isOwner && "ou compartilhe um objetivo com sua organização"}.
              </p>
              <div className="flex gap-2">
                 <GoalModal accounts={accounts} />
                 {isOwner && <GoalModal isShared={true} workspaces={workspaces} />}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}