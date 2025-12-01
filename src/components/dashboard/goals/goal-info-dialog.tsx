'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, Calendar, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TransactionData {
  amount: number;
  date: Date;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | string;
}

interface GoalInfoProps {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: Date | null;
    createdAt: Date;
    transactions: TransactionData[];
  };
  // Nova prop opcional para dados personalizados
  myShare?: {
      percentage: number;
      target: number;
      saved: number;
  } | null;
}

export function GoalInfoDialog({ goal, myShare }: GoalInfoProps) {
  
  const now = new Date();
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(now.getDate() - 30);
  const threeMonthsAgo = new Date(); threeMonthsAgo.setDate(now.getDate() - 90);

  // 1. Saldo Líquido Global (Últimos 30 dias)
  const calculateNetSavings = (fromDate: Date) => {
    return goal.transactions
      .filter(t => new Date(t.date) >= fromDate)
      .reduce((acc, t) => {
        if (t.type === 'EXPENSE') return acc + Number(t.amount); 
        if (t.type === 'INCOME') return acc - Number(t.amount);
        return acc;
      }, 0);
  };

  const savedLastMonth = calculateNetSavings(oneMonthAgo);
  const savedLast3Months = calculateNetSavings(threeMonthsAgo);

  // 2. Média Mensal Global
  const daysSinceCreation = Math.max(1, (now.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const monthsSinceCreation = Math.max(1, daysSinceCreation / 30.44);
  const averageMonthly = Number(goal.currentAmount) / monthsSinceCreation;

  // 3. Status
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  
  // Lógica de Previsão de Término
  let estimatedDate: Date | null = null;
  if (remainingAmount > 0 && averageMonthly > 0) {
    const monthsToFinish = remainingAmount / averageMonthly;
    if (monthsToFinish < 1200) { 
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + Math.round(monthsToFinish));
        estimatedDate = futureDate;
    }
  }

  let status = "ON_TRACK"; 
  if (goal.deadline) {
      if (estimatedDate && estimatedDate > new Date(goal.deadline)) status = "DELAYED";
      else if (!estimatedDate && remainingAmount > 0) status = "DELAYED";
  }
  if (goal.currentAmount >= goal.targetAmount) status = "COMPLETED";

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // === CÁLCULO DE RECOMENDAÇÃO MENSAL ===
  let monthlyRecommendation = 0;
  let myMonthlyRecommendation = 0;
  
  if (goal.deadline && remainingAmount > 0) {
      const monthsUntilDeadline = (new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      
      // Cálculo Global
      if (monthsUntilDeadline <= 0) {
          monthlyRecommendation = remainingAmount; 
      } else {
          monthlyRecommendation = remainingAmount / monthsUntilDeadline;
      }

      // Cálculo da Minha Parte (Se houver regra de compartilhamento)
      if (myShare) {
          const myRemaining = Math.max(0, myShare.target - myShare.saved);
          if (monthsUntilDeadline <= 0) {
              myMonthlyRecommendation = myRemaining;
          } else {
              myMonthlyRecommendation = myRemaining / monthsUntilDeadline;
          }
      }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Análise: {goal.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          
          {/* BLOCO PRINCIPAL */}
          <div className="bg-muted p-4 rounded-lg border border-border flex items-center justify-between">
             <div>
                <p className="text-xs text-muted-foreground uppercase">Previsão de Conclusão</p>
                <p className="text-lg font-bold text-foreground">
                    {status === "COMPLETED"
                        ? "Objetivo Concluído! 🎉" 
                        : estimatedDate 
                            ? estimatedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                            : (averageMonthly <= 0 ? "Sem poupança mensal" : "Em mais de 100 anos")}
                </p>
             </div>
             {status === 'DELAYED' && (
                 <div className="flex flex-col items-end text-rose-500">
                     <AlertTriangle className="w-6 h-6 mb-1" />
                     <span className="text-xs font-bold">Risco de Atraso</span>
                 </div>
             )}
             {status === 'ON_TRACK' && remainingAmount > 0 && (
                 <div className="flex flex-col items-end text-emerald-500">
                     <CheckCircle2 className="w-6 h-6 mb-1" />
                     <span className="text-xs font-bold">No Prazo</span>
                 </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Poupança Global (30 dias)</p>
                <p className={`text-xl font-semibold ${savedLastMonth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(savedLastMonth)}
                </p>
            </div>
            <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Média Histórica (Global)</p>
                <p className={`text-xl font-semibold ${averageMonthly >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                    {formatCurrency(averageMonthly)}
                </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso Global</span>
                <span className={`${savedLast3Months >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                    {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                </span>
            </div>
            <Progress value={(Number(goal.currentAmount) / (goal.targetAmount || 1)) * 100} className="h-1.5 bg-secondary" />
          </div>

          {goal.deadline && remainingAmount > 0 && (
            <div className="flex flex-col gap-3 bg-muted/50 p-3 rounded border border-border">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                        <p>Prazo final: <span className="text-foreground font-medium">{new Date(goal.deadline).toLocaleDateString('pt-BR')}</span></p>
                    </div>
                </div>

                {status === 'DELAYED' && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                        {/* Se for meta compartilhada, mostra a SUA recomendação em destaque */}
                        {myShare ? (
                            <>
                                <div className="flex items-center gap-2 text-purple-500 bg-purple-500/10 p-2 rounded">
                                    <Users className="w-4 h-4" />
                                    <div>
                                        <p className="text-xs font-bold uppercase">Sua Recomendação ({myShare.percentage}%)</p>
                                        <p className="text-sm">
                                            Guarde <span className="font-bold">{formatCurrency(myMonthlyRecommendation)}/mês</span> para cumprir sua parte.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground ml-1">
                                    (Recomendação Global: {formatCurrency(monthlyRecommendation)}/mês)
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-rose-500">
                                Para terminar no prazo, o ideal seria guardar <span className="font-bold">{formatCurrency(monthlyRecommendation)}/mês</span>.
                            </p>
                        )}
                    </div>
                )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}