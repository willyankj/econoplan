import { getUserWorkspace } from "@/lib/get-user-workspace";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Trophy, Users, Trash2, Calendar, Clock, TrendingDown, AlertCircle, ShieldCheck } from "lucide-react";
import { GoalModal } from "@/components/dashboard/goals/goal-modal";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { redirect } from "next/navigation";
import { deleteGoal } from "@/app/dashboard/actions/finance"; 
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
        vaults: { include: { bankAccount: true } },
        transactions: { select: { amount: true, date: true, type: true, workspaceId: true }, orderBy: { date: 'desc' } } 
    },
    orderBy: { deadline: 'asc' }
  });

  const accountsRaw = await prisma.bankAccount.findMany({
    where: { workspaceId },
    select: { id: true, name: true, bank: true, balance: true, vaults: true, workspace: { select: { name: true } } }
  });
  
  const accounts = accountsRaw.map(a => ({
      ...a, 
      balance: Number(a.balance), 
      vaults: a.vaults.map(v => ({...v, balance: Number(v.balance)})),
      workspaceName: a.workspace.name
  }));

  const goals = goalsRaw.map(g => {
      const totalSaved = Number(g.currentAmount); 
      const myVault = g.vaults.find(v => v.bankAccount.workspaceId === workspaceId);
      const mySaved = myVault ? Number(myVault.balance) : 0;
      
      return {
          ...g,
          targetAmount: Number(g.targetAmount),
          currentAmount: totalSaved,
          // SERIALIZAÇÃO SEGURA: Transforma Data em String ISO
          transactions: g.transactions.map(t => ({
              ...t, 
              amount: Number(t.amount), 
              date: t.date.toISOString() 
          })), 
          myVault, 
          mySaved
      };
  });

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
            <GoalModal accounts={accounts} myWorkspaceId={workspaceId} /> 
            {isOwner && (
                <GoalModal isShared={true} workspaces={workspaces} accounts={accounts} myWorkspaceId={workspaceId} isOwner={true} />
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
            const amountLeft = Math.max(0, target - current);
            const monthsSinceStart = Math.max(1, differenceInMonths(today, createdAt));

            const avgSavedPerMonth = current / monthsSinceStart;
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

            // Conversão segura de datas para o Dialog (Client Component)
            const insights = {
                monthlyNeeded,
                avgSaved: avgSavedPerMonth,
                healthStatus,
                daysLeft: deadline ? differenceInDays(deadline, today) : null,
                projectionDate: projectionDate ? projectionDate.toISOString() : null // Serializa
            };

            const isShared = !!goal.tenantId;
            const rules = goal.contributionRules as any || {};
            const isInvited = isShared && (rules[workspaceId] !== undefined);
            const isParticipating = !!goal.myVault;

            let myTarget = goal.targetAmount;
            let myShareText = "";
            let statusBadge = null;

            if (isShared) {
                if (isInvited) {
                    const myPercent = rules[workspaceId];
                    myTarget = (goal.targetAmount * myPercent) / 100;
                    myShareText = `(${myPercent}%)`;
                } else if (isOwner) {
                    myShareText = "(Gestor)";
                    statusBadge = "Gestor (Sem Cota)";
                } else {
                    myShareText = "(Visualizando)";
                    statusBadge = "Apenas Visualização";
                }
            }
            
            const shareInfo = {
                target: myTarget,
                saved: goal.mySaved
            };
            
            const myProgress = myTarget > 0 ? Math.min((goal.mySaved / myTarget) * 100, 100) : 0;

            const cardBorderColor = isCompleted ? 'border-emerald-500/50' : (isShared ? 'border-purple-500/30' : 'border-border');
            const iconBg = isCompleted ? 'bg-emerald-100 text-emerald-600' : (isShared ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600');
            const icon = isCompleted ? <Trophy className="w-5 h-5" /> : (isShared ? <Users className="w-5 h-5" /> : <Target className="w-5 h-5" />);
            const progressBarColor = isShared ? "[&>div]:bg-purple-500" : "[&>div]:bg-blue-500";

            return (
              <Card key={goal.id} className={`flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden border ${cardBorderColor}`}>
                {isShared && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />}
                
                <CardHeader className="pb-3 pl-5 pr-5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 overflow-hidden flex-1">
                      <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold truncate leading-snug" title={goal.name}>
                            {goal.name}
                          </CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {deadline ? (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {deadline.toLocaleDateString('pt-BR')}</span>
                        ) : (
                            <span className="italic flex items-center gap-1"><Clock className="w-3 h-3" /> Sem prazo</span>
                        )}
                        {isShared && isOwner && (
                            <span className="flex items-center gap-1 text-purple-600 font-medium ml-2 bg-purple-100 px-1.5 py-0.5 rounded text-[10px]">
                                <ShieldCheck className="w-3 h-3" /> Dono
                            </span>
                        )}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl shrink-0 shadow-sm ${iconBg}`}>{icon}</div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5 pt-0 pl-5 pr-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-bold text-foreground tracking-tight">
                            {formatCurrency(current)}
                        </span>
                        <div className="text-right">
                             <span className="text-[10px] text-muted-foreground uppercase block">Meta Total</span>
                             <span className="text-xs font-medium text-foreground">{formatCurrency(target)}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <Progress value={progress} className={`h-2.5 ${progressBarColor}`} />
                    </div>
                  </div>

                  {isShared && (
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-foreground">Sua Parte {myShareText}</span>
                              {isParticipating ? (
                                  <span className="text-muted-foreground">{formatCurrency(goal.mySaved)} / {formatCurrency(myTarget)}</span>
                              ) : (
                                  <span className="text-amber-600 font-medium">{statusBadge || "Pendente"}</span>
                              )}
                          </div>
                          {(isParticipating || (isInvited && !statusBadge)) && (
                              <Progress value={myProgress} className="h-1.5 [&>div]:bg-blue-500" />
                          )}
                      </div>
                  )}

                  <div className="flex gap-2 pt-2 mt-auto items-center border-t border-border/40">
                    <div className="flex-1">
                        {isParticipating ? (
                            <DepositGoalModal 
                                goal={{...goal, vaultId: goal.myVault?.id}} 
                                accounts={accounts} 
                                type="DEPOSIT" 
                                label="Aportar"
                            />
                        ) : isInvited ? (
                            <GoalModal goal={goal} isShared={isShared} accounts={accounts} myWorkspaceId={workspaceId} />
                        ) : (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 opacity-50 select-none py-2">
                                {statusBadge && <AlertCircle className="w-3 h-3" />} {statusBadge || "Meta Pessoal"}
                            </div>
                        )}
                    </div>
                    
                    {/* GoalInfoDialog adaptado para receber Date como string ou objeto */}
                    <GoalInfoDialog 
                        goal={goal} 
                        myShare={shareInfo} 
                        insights={{
                            ...insights,
                            projectionDate: insights.projectionDate ? new Date(insights.projectionDate) : null
                        }} 
                    />
                    
                    {(!isShared || isOwner) && (
                        <GoalModal goal={goal} isShared={isShared} workspaces={workspaces} accounts={accounts} myWorkspaceId={workspaceId} isOwner={isOwner} />
                    )}
                    
                    {(!isShared || isOwner) && (
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
      </div>
    </div>
  );
}