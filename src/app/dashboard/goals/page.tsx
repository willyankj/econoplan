import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Trophy, Calendar, Target, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getUserWorkspace } from "@/lib/get-user-workspace";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { deleteGoal } from "@/app/dashboard/actions";
import { NewGoalModal } from "@/components/dashboard/goals/new-goal-modal";
import { EditGoalModal } from "@/components/dashboard/goals/edit-goal-modal";
import { GoalInfoDialog } from "@/components/dashboard/goals/goal-info-dialog";
import { formatCurrency } from "@/lib/utils"; // <--- Importado

export default async function GoalsPage() {
  const { workspaceId, user } = await getUserWorkspace();
  if (!workspaceId || !user) return <div>Selecione um workspace</div>;

  const rawGoals = await prisma.goal.findMany({
    where: {
      OR: [
        { workspaceId: workspaceId },
        { tenantId: user.tenantId }
      ]
    },
    include: { transactions: true },
    orderBy: { createdAt: 'desc' }
  });

  const goals = rawGoals.map(g => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    transactions: g.transactions.map(t => ({...t, amount: Number(t.amount)}))
  }));

  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId } });
  const accountsClean = rawAccounts.map(a => ({...a, balance: Number(a.balance)}));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meus Objetivos</h2>
          <p className="text-muted-foreground">Sonhos e Metas Financeiras</p>
        </div>
        <NewGoalModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const current = goal.currentAmount;
          const target = goal.targetAmount;
          const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          const isShared = !!goal.tenantId;

          return (
            <Card key={goal.id} className={`relative overflow-hidden bg-card border-border transition-all group ${isShared ? 'border-purple-500/30' : 'hover:border-emerald-500/30'}`}>
              {isShared && <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 z-10" />}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-8 -mt-8 pointer-events-none ${isShared ? 'bg-gradient-to-br from-purple-500/20 to-transparent' : 'bg-gradient-to-br from-yellow-500/20 to-transparent'}`} />

              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                   {isShared ? <Users className="w-5 h-5 text-purple-500" /> : <Trophy className="w-5 h-5 text-yellow-500" />}
                   <span className="truncate">{goal.name}</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                    {isShared && <span className="text-[10px] font-bold bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded uppercase mr-2">Conjunta</span>}
                    <GoalInfoDialog goal={goal} />
                    {!isShared && (
                        <>
                            <EditGoalModal goal={goal} />
                            <form action={async () => { 'use server'; await deleteGoal(goal.id); }}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </form>
                        </>
                    )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-5 relative z-10">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Guardado: <span className="text-foreground font-bold">{formatCurrency(current)}</span></span>
                        <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={percentage} className={`h-3 bg-secondary ${isShared ? "[&>div]:bg-purple-500" : ""}`} />
                    <p className="text-xs text-right text-muted-foreground">Meta: {formatCurrency(target)}</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1"><DepositGoalModal goal={goal} accounts={accountsClean} type="DEPOSIT" /></div>
                    <div className="flex-1"><DepositGoalModal goal={goal} accounts={accountsClean} type="WITHDRAW" disabled={current <= 0} /></div>
                </div>
                {goal.deadline && (
                    <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Meta para: {goal.deadline.toLocaleDateString('pt-BR')}
                    </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* --- ESTADO VAZIO EXCLUSIVO (METAS) --- */}
        {goals.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 border border-yellow-500/20 rounded-2xl bg-gradient-to-b from-yellow-500/5 to-transparent text-muted-foreground">
              <div className="relative mb-4">
                  <Target className="w-16 h-16 text-yellow-600 dark:text-yellow-500" />
                  <Star className="w-6 h-6 text-yellow-300 absolute -top-1 -right-2 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Qual é o seu próximo sonho?</h3>
              <p className="text-sm max-w-md text-center mb-8">
                  Viagem, carro novo ou reserva de emergência? Crie uma meta e acompanhe seu progresso visualmente.
              </p>
              <NewGoalModal />
           </div>
        )}
      </div>
    </div>
  );
}