'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
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
}

export function GoalInfoDialog({ goal }: GoalInfoProps) {
  
  // --- CÁLCULOS MATEMÁTICOS ---
  const now = new Date();
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(now.getDate() - 30);
  const threeMonthsAgo = new Date(); threeMonthsAgo.setDate(now.getDate() - 90);

  // 1. Função para calcular saldo líquido (Depósitos - Saques) no período
  const calculateNetSavings = (fromDate: Date) => {
    return goal.transactions
      .filter(t => new Date(t.date) >= fromDate)
      .reduce((acc, t) => {
        // EXPENSE = Depósito na meta (Soma)
        if (t.type === 'EXPENSE') return acc + Number(t.amount);
        // INCOME = Resgate da meta (Subtrai)
        if (t.type === 'INCOME') return acc - Number(t.amount);
        return acc;
      }, 0);
  };

  const savedLastMonth = calculateNetSavings(oneMonthAgo);
  const savedLast3Months = calculateNetSavings(threeMonthsAgo);

  // 2. Média Mensal (Baseada no Saldo Atual Real)
  const monthsSinceCreation = Math.max(1, (now.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const averageMonthly = Number(goal.currentAmount) / monthsSinceCreation;

  // 3. Previsão de Término
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  let estimatedDate: Date | null = null;

  // Só calcula previsão se tiver saldo restante e a média for positiva
  if (remainingAmount > 0 && averageMonthly > 0) {
    const monthsToFinish = remainingAmount / averageMonthly;
    
    // CORREÇÃO AQUI: Se for demorar menos de 100 anos, calcula.
    // Se for mais, deixamos null para cair no fallback de texto.
    if (monthsToFinish < 1200) { 
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + Math.round(monthsToFinish));
        estimatedDate = futureDate;
    }
  }

  // 4. Status do Prazo
  let status = "ON_TRACK"; 
  if (goal.deadline && estimatedDate) {
    if (estimatedDate > new Date(goal.deadline)) status = "DELAYED";
  } else if (goal.deadline && !estimatedDate && remainingAmount > 0) {
    // Se tem prazo, mas a estimativa é infinita (>100 anos), está atrasado
    status = "DELAYED";
  }
  
  if (goal.currentAmount >= goal.targetAmount) status = "COMPLETED";

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-400">
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
          
          {/* Status Geral */}
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

          {/* Estatísticas de Poupança */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Poupança Líquida (30 dias)</p>
                <p className={`text-xl font-semibold ${savedLastMonth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(savedLastMonth)}
                </p>
            </div>
            <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Média Mensal</p>
                <p className={`text-xl font-semibold ${averageMonthly >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                    {formatCurrency(averageMonthly)}
                </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Movimentação (90 dias)</span>
                <span className={`${savedLast3Months >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                    {formatCurrency(savedLast3Months)}
                </span>
            </div>
            <Progress value={(Number(goal.currentAmount) / (goal.targetAmount || 1)) * 100} className="h-1.5 bg-secondary" />
          </div>

          {/* Detalhe do Prazo */}
          {goal.deadline && remainingAmount > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded border border-border">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                    <p>Meta definida para: <span className="text-foreground">{new Date(goal.deadline).toLocaleDateString('pt-BR')}</span></p>
                    {status === 'DELAYED' && (
                        <p className="text-xs text-rose-400 mt-1">
                            Para terminar no prazo, você precisa guardar <span className="font-bold">R$ {formatCurrency(remainingAmount / Math.max(1, ((new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))))}/mês</span>.
                        </p>
                    )}
                </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
