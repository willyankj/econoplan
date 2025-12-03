'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Target, // <--- Faltava este
  Users   // <--- Faltava este
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GoalInfoDialogProps {
  goal: any;
  myShare: any; // Dados da participação individual
  insights: {
    monthlyNeeded: number;
    avgSaved: number;
    healthStatus: string;
    daysLeft: number | null;
    projectionDate?: Date | null;
  } | null;
}

export function GoalInfoDialog({ goal, myShare, insights }: GoalInfoDialogProps) {
  const isShared = !!goal.tenantId;
  const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  
  // Cores de status
  let statusColor = "text-muted-foreground";
  let statusBg = "bg-muted";
  let statusText = "Em andamento";
  let StatusIcon = Clock;

  if (insights?.healthStatus === 'healthy') {
      statusColor = "text-emerald-600";
      statusBg = "bg-emerald-100 dark:bg-emerald-900/30";
      statusText = "No Ritmo Certo";
      StatusIcon = CheckCircle2;
  } else if (insights?.healthStatus === 'warning') {
      statusColor = "text-amber-600";
      statusBg = "bg-amber-100 dark:bg-amber-900/30";
      statusText = "Atenção Necessária";
      StatusIcon = AlertTriangle;
  } else if (insights?.healthStatus === 'danger') {
      statusColor = "text-rose-600";
      statusBg = "bg-rose-100 dark:bg-rose-900/30";
      statusText = "Risco de Atraso";
      StatusIcon = TrendingUp;
  } else if (insights?.healthStatus === 'completed') {
      statusColor = "text-emerald-600";
      statusBg = "bg-emerald-100 dark:bg-emerald-900/30";
      statusText = "Concluído!";
      StatusIcon = CheckCircle2;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <div className="flex justify-between items-start mr-6">
              <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      {goal.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${statusBg} ${statusColor}`}>
                          {statusText}
                      </span>
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                      Detalhes e projeções da meta {isShared ? 'compartilhada' : 'pessoal'}.
                  </p>
              </div>
              <div className="text-right">
                  <span className="block text-2xl font-bold text-foreground">{formatCurrency(goal.currentAmount)}</span>
                  <span className="text-xs text-muted-foreground">de {formatCurrency(goal.targetAmount)}</span>
              </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
            {/* BARRA DE PROGRESSO */}
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex justify-between text-xs font-medium mb-2">
                    <span>Progresso Geral</span>
                    <span>{progress.toFixed(1)}%</span>
                </div>
                <Progress value={progress} className={`h-3 ${isShared ? "[&>div]:bg-purple-500" : "[&>div]:bg-emerald-500"}`} />
                {insights?.daysLeft !== null && insights?.daysLeft !== undefined && (
                    <p className="text-right text-[10px] text-muted-foreground mt-1">
                        {insights.daysLeft > 0 ? `${insights.daysLeft} dias restantes` : 'Prazo finalizado'}
                    </p>
                )}
            </div>

            {/* CARDS DE ESTATÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 border border-border rounded-lg bg-background flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Ritmo Atual
                    </span>
                    <span className="text-lg font-bold">{formatCurrency(insights?.avgSaved || 0)}</span>
                    <span className="text-[10px] text-muted-foreground">média / mês</span>
                </div>
                
                <div className="p-3 border border-border rounded-lg bg-background flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                        <Target className="w-3 h-3" /> Necessário
                    </span>
                    <span className="text-lg font-bold text-amber-600">{formatCurrency(insights?.monthlyNeeded || 0)}</span>
                    <span className="text-[10px] text-muted-foreground">para bater a meta</span>
                </div>

                <div className="p-3 border border-border rounded-lg bg-background flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Previsão
                    </span>
                    <span className="text-sm font-bold truncate">
                        {insights?.projectionDate 
                            ? insights.projectionDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                            : (progress >= 100 ? "Concluído" : "Indefinido")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">data estimada</span>
                </div>
            </div>

            {/* SEÇÃO COMPARTILHADA (SE HOUVER) */}
            {isShared && myShare && (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" /> Sua Participação
                    </h4>
                    <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                        <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-purple-900 dark:text-purple-300">Cota definida</span>
                                <span className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(myShare.target)}</span>
                            </div>
                            <Progress value={(myShare.saved / myShare.target) * 100} className="h-1.5 [&>div]:bg-purple-500" />
                        </div>
                        <div className="text-right">
                            <span className="block text-sm font-bold text-purple-700 dark:text-purple-400">{formatCurrency(myShare.saved)}</span>
                            <span className="text-[10px] text-purple-600/70">acumulado</span>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTÓRICO RECENTE */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" /> Últimas Movimentações
                </h4>
                <ScrollArea className="h-[150px] border border-border rounded-md p-2">
                    {goal.transactions && goal.transactions.length > 0 ? (
                        <div className="space-y-2">
                            {goal.transactions.slice(0, 10).map((t: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs p-2 hover:bg-muted/50 rounded transition-colors">
                                    <div className="flex items-center gap-2">
                                        {t.type === 'VAULT_DEPOSIT' || t.type === 'EXPENSE' ? (
                                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3 text-amber-500" />
                                        )}
                                        <span className="text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <span className={`font-medium ${t.type === 'VAULT_DEPOSIT' || t.type === 'EXPENSE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {t.type === 'VAULT_DEPOSIT' || t.type === 'EXPENSE' ? '+' : '-'} {formatCurrency(t.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs opacity-50">
                            <History className="w-8 h-8 mb-1" />
                            Nenhuma movimentação recente.
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}