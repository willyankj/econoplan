'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Calculator, TrendingUp, Calendar, AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalInfoDialogProps {
  goal: any;
  myShare?: {
      percentage: number;
      target: number;
      saved: number;
      totalTarget: number;
  } | null;
  insights?: {
      monthlyNeeded: number;
      avgSaved: number;
      projectionDate: Date | null;
      healthStatus: string;
      daysLeft: number | null;
  } | null;
}

export function GoalInfoDialog({ goal, myShare, insights }: GoalInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500 rounded-full">
            <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Detalhes da Meta
          </DialogTitle>
          <DialogDescription>
            Raio-X completo do objetivo <strong>{goal.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
            
            {/* BLOCO 1: Participação Individual (Apenas para Meta Coletiva) */}
            {myShare && (
                <div className="space-y-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
                        <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Sua Participação ({myShare.percentage}%)
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="block text-muted-foreground uppercase text-[10px]">Sua Cota</span>
                                <span className="font-bold text-lg">{formatCurrency(myShare.target)}</span>
                            </div>
                            <div>
                                <span className="block text-muted-foreground uppercase text-[10px]">Você Guardou</span>
                                <span className="font-bold text-lg text-purple-600">{formatCurrency(myShare.saved)}</span>
                            </div>
                        </div>
                        {/* Barra de progresso individual */}
                        <div className="w-full bg-purple-200 dark:bg-purple-900/50 h-1.5 rounded-full overflow-hidden mt-3">
                             <div className="bg-purple-500 h-full" style={{ width: `${Math.min((myShare.saved / myShare.target) * 100, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-purple-600/80 mt-1 text-right">
                            {((myShare.saved / myShare.target) * 100).toFixed(1)}% da sua parte
                        </p>
                    </div>

                    {/* Divisor Visual */}
                    <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-border"></div>
                        <span className="flex-shrink-0 mx-2 text-[10px] text-muted-foreground uppercase font-semibold">Progresso Geral (Grupo)</span>
                        <div className="flex-grow border-t border-border"></div>
                    </div>
                </div>
            )}

            {/* BLOCO 2: Insights Analíticos (Agora aparece para TODOS) */}
            {insights && (
                <div className="space-y-4">
                    {/* Status Geral */}
                    <div className={`p-3 rounded-lg border flex items-start gap-3 ${
                        insights.healthStatus === 'healthy' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' :
                        insights.healthStatus === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
                        insights.healthStatus === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300' :
                        insights.healthStatus === 'completed' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' :
                        'bg-muted border-border text-muted-foreground'
                    }`}>
                        {insights.healthStatus === 'healthy' || insights.healthStatus === 'completed' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> :
                         insights.healthStatus === 'danger' ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> :
                         <Info className="w-5 h-5 shrink-0 mt-0.5" />}
                        
                        <div className="text-xs">
                            <p className="font-bold mb-0.5">
                                {insights.healthStatus === 'healthy' ? (myShare ? 'Grupo Adiantado!' : 'Excelente Ritmo!') :
                                 insights.healthStatus === 'warning' ? (myShare ? 'Grupo em Atenção' : 'Atenção ao Ritmo') :
                                 insights.healthStatus === 'danger' ? (myShare ? 'Grupo Atrasado' : 'Risco de Atraso') :
                                 insights.healthStatus === 'completed' ? 'Meta Concluída!' :
                                 'Sem dados suficientes'}
                            </p>
                            <p className="opacity-90 leading-snug">
                                {insights.healthStatus === 'healthy' ? ` ${myShare ? 'O grupo está' : 'você está'} guardando mais do que o necessário. Continuem assim!` :
                                 insights.healthStatus === 'danger' ? `Neste ritmo, ${myShare ? 'o grupo' : 'você'} não alcançará a meta no prazo estipulado.` :
                                 insights.healthStatus === 'completed' ? 'Parabéns! O objetivo foi alcançado.' :
                                 `Mantenha a constância nos depósitos para atingir o objetivo.`}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Sugestão Mensal */}
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                <Calculator className="w-3 h-3" /> Sugestão {myShare ? '(Total)' : ''}
                            </p>
                            <p className="text-lg font-bold">
                                {insights.monthlyNeeded > 0 ? formatCurrency(insights.monthlyNeeded) : '-'}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Depósito mensal necessário
                            </p>
                        </div>

                        {/* Média Atual */}
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Média {myShare ? 'do Grupo' : 'Real'}
                            </p>
                            <p className={`text-lg font-bold ${insights.avgSaved < insights.monthlyNeeded && insights.monthlyNeeded > 0 ? 'text-rose-500' : ''}`}>
                                {formatCurrency(insights.avgSaved)}
                            </p>
                             <p className="text-[10px] text-muted-foreground mt-1">
                                Por mês (histórico)
                            </p>
                        </div>
                    </div>

                    {/* Previsão de Conclusão */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <p className="text-[10px] uppercase text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Previsão de Conclusão {myShare ? '(Global)' : ''}
                        </p>
                        <div className="flex justify-between items-end">
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {insights.projectionDate ? format(insights.projectionDate, "MMMM 'de' yyyy", { locale: ptBR }) : "Indefinido"}
                            </p>
                            {insights.daysLeft !== null && insights.daysLeft > 0 && (
                                <span className="text-[10px] text-blue-500 font-medium bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                                    Faltam {Math.ceil(insights.daysLeft / 30)} meses
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Rodapé Padrão */}
            <div className="bg-muted/20 p-3 rounded-lg text-xs text-muted-foreground flex gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <p>Meta criada em: {new Date(goal.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}