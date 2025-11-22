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

// Interface corrigida para aceitar os tipos do Prisma
interface TransactionData {
  amount: number;
  date: Date;
  // CORREÇÃO AQUI: Adicionei string para ser compatível com o Enum do Banco (incluindo TRANSFER)
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

  // Filtra apenas depósitos (type: EXPENSE pois saiu da conta -> entrou na meta)
  const deposits = goal.transactions.filter(t => t.type === 'EXPENSE');

  const savedLastMonth = deposits
    .filter(t => new Date(t.date) >= oneMonthAgo)
    .reduce((acc, t) => acc + t.amount, 0);

  const savedLast3Months = deposits
    .filter(t => new Date(t.date) >= threeMonthsAgo)
    .reduce((acc, t) => acc + t.amount, 0);

  // Média Mensal (Total Guardado / Meses desde a criação ou 1)
  const monthsSinceCreation = Math.max(1, (now.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const averageMonthly = goal.currentAmount / monthsSinceCreation;

  // Previsão de Término
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  let monthsToFinish = 0;
  let estimatedDate: Date | null = null;

  if (remainingAmount > 0 && averageMonthly > 0) {
    monthsToFinish = remainingAmount / averageMonthly;
    estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + Math.round(monthsToFinish));
  }

  // Status do Prazo
  let status = "ON_TRACK"; // No prazo
  if (goal.deadline && estimatedDate) {
    if (estimatedDate > new Date(goal.deadline)) status = "DELAYED"; // Atrasado
    if (goal.currentAmount >= goal.targetAmount) status = "COMPLETED";
  }

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
                    {goal.currentAmount >= goal.targetAmount 
                        ? "Objetivo Concluído! 🎉" 
                        : estimatedDate 
                            ? estimatedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                            : "Sem dados suficientes"}
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
                <p className="text-xs text-muted-foreground">Poupança (30 dias)</p>
                <p className="text-xl font-semibold text-emerald-500">{formatCurrency(savedLastMonth)}</p>
            </div>
            <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Média Mensal</p>
                <p className="text-xl font-semibold text-blue-500">{formatCurrency(averageMonthly)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Poupança (90 dias)</span>
                <span className="text-foreground">{formatCurrency(savedLast3Months)}</span>
            </div>
            <Progress value={(savedLast3Months / (goal.targetAmount || 1)) * 100} className="h-1.5 bg-secondary" />
          </div>

          {/* Detalhe do Prazo */}
          {goal.deadline && remainingAmount > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded border border-border">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                    <p>Meta definida para: <span className="text-foreground">{new Date(goal.deadline).toLocaleDateString('pt-BR')}</span></p>
                    {status === 'DELAYED' && (
                        <p className="text-xs text-rose-400 mt-1">
                            Nesse ritmo, você vai terminar em {estimatedDate?.toLocaleDateString('pt-BR')}. 
                            Tente guardar <span className="font-bold">R$ {formatCurrency(remainingAmount / ((new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)))}/mês</span>.
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