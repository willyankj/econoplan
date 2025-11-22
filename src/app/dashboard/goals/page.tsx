import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Trophy, Calendar, Target } from "lucide-react"; // <--- ADICIONEI O TARGET AQUI
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Componentes
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { deleteGoal } from "@/app/dashboard/actions";
import { NewGoalModal } from "@/components/dashboard/goals/new-goal-modal";
import { EditGoalModal } from "@/components/dashboard/goals/edit-goal-modal";
import { GoalInfoDialog } from "@/components/dashboard/goals/goal-info-dialog";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: true }
  });

  if (!user || user.workspaces.length === 0) return <div>Sem workspace</div>;
  const workspaceId = user.workspaces[0].workspaceId;

  // 1. Busca Metas
  const rawGoals = await prisma.goal.findMany({
    where: { workspaceId },
    include: { transactions: true },
    orderBy: { createdAt: 'desc' }
  });

  const goals = rawGoals.map(g => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    transactions: g.transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
    }))
  }));

  // 2. Busca Contas
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId } });
  const accountsClean = rawAccounts.map(a => ({...a, balance: Number(a.balance)}));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

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

          return (
            <Card key={goal.id} className="relative overflow-hidden bg-card border-border hover:border-emerald-500/30 transition-all group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                   <Trophy className="w-5 h-5 text-yellow-500" />
                   {goal.name}
                </CardTitle>
                
                <div className="flex items-center gap-1">
                    {/* Botão de Inteligência */}
                    <GoalInfoDialog goal={goal} />

                    {/* Botão Editar */}
                    <EditGoalModal goal={goal} />

                    <form action={async () => {
                        'use server';
                        await deleteGoal(goal.id);
                    }}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-5">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Guardado: <span className="text-foreground font-bold">{formatCurrency(current)}</span></span>
                        <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={percentage} className="h-3 bg-secondary" />
                    <p className="text-xs text-right text-muted-foreground">Meta: {formatCurrency(target)}</p>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <DepositGoalModal goal={goal} accounts={accountsClean} type="DEPOSIT" />
                    </div>
                    <DepositGoalModal goal={goal} accounts={accountsClean} type="WITHDRAW" />
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

        {goals.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-xl text-muted-foreground">
              {/* AQUI ESTAVA O ERRO */}
              <Target className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhum objetivo definido.</p>
              <p className="text-sm">Comece a guardar dinheiro para seus sonhos.</p>
           </div>
        )}
      </div>
    </div>
  );
}