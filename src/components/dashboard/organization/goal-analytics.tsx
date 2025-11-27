'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Target, Trophy, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    contributionRules: any; // JSON
    transactions: any[];
  };
  workspaces: { id: string; name: string }[];
}

export function GoalAnalytics({ goal, workspaces }: Props) {
  // 1. Calcular quanto cada workspace pagou
  const contributions: Record<string, number> = {};
  
  goal.transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
          contributions[t.workspaceId] = (contributions[t.workspaceId] || 0) + Number(t.amount);
      }
  });

  // 2. Preparar dados (Filtrando apenas quem participa ou pagou)
  const analyticsData = workspaces
    .map(ws => {
        const paid = contributions[ws.id] || 0;
        const targetPercent = goal.contributionRules?.[ws.id] || 0;
        
        // Se não tem regra definida E não pagou nada, ignoramos esse workspace na análise
        if (!targetPercent && paid === 0) return null;

        const targetValue = (goal.targetAmount * targetPercent) / 100;
        
        // Progresso individual em relação à SUA parte
        // Se não tem targetValue (ex: 0%), mas pagou, o progresso é infinito (100%+)
        const personalProgress = targetValue > 0 ? (paid / targetValue) * 100 : (paid > 0 ? 100 : 0);
        
        const totalShare = goal.targetAmount > 0 ? (paid / goal.targetAmount) * 100 : 0;

        return {
            id: ws.id,
            name: ws.name,
            paid,
            targetPercent,
            targetValue,
            personalProgress,
            totalShare
        };
    })
    .filter(item => item !== null) // Remove os nulos
    .sort((a, b) => (b!.paid - a!.paid)); // Ordena pelo maior pagador

  // @ts-ignore (TypeScript reclama do filter null, mas garantimos acima)
  const topContributor = analyticsData.length > 0 && analyticsData[0].paid > 0 ? analyticsData[0] : null;

  return (
    <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topContributor ? (
                <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-500">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Maior Contribuidor</p>
                            <p className="text-lg font-bold text-foreground">{topContributor.name}</p>
                            <p className="text-xs text-muted-foreground">Contribuiu com {formatCurrency(topContributor.paid)}</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                // Placeholder se ninguém pagou ainda
                <Card className="bg-muted/20 border-dashed border-border shadow-none">
                    <CardContent className="p-4 flex items-center justify-center text-muted-foreground text-sm italic">
                        Nenhuma contribuição ainda.
                    </CardContent>
                </Card>
            )}
            
            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-full text-purple-500">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Falta para a Meta</p>
                        <p className="text-lg font-bold text-foreground">
                            {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {( (goal.currentAmount / (goal.targetAmount || 1)) * 100 ).toFixed(1)}% Concluído
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Detalhamento por Workspace (Apenas participantes) */}
        <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>Participantes</span>
                <span className="text-xs text-muted-foreground font-normal">{analyticsData.length} workspace(s)</span>
            </h4>
            
            {/* @ts-ignore */}
            {analyticsData.map(data => {
                const isBehind = data.targetPercent > 0 && data.personalProgress < ((goal.currentAmount / (goal.targetAmount || 1)) * 100); 

                return (
                    <div key={data.id} className="bg-muted/30 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground">{data.name}</span>
                                {data.targetPercent > 0 ? (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded">
                                        Resp: {data.targetPercent}%
                                    </span>
                                ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                                        Voluntário
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-sm block">{formatCurrency(data.paid)}</span>
                                {data.targetValue > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        de {formatCurrency(data.targetValue)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Barra de Progresso Individual */}
                        <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-1.5">
                            <div 
                                className={`h-full rounded-full transition-all ${data.personalProgress >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(data.personalProgress, 100)}%` }}
                            />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                                {data.personalProgress.toFixed(0)}% da parte dele(a)
                            </span>
                            
                            {data.targetPercent > 0 && (
                                data.personalProgress >= 100 ? (
                                    <span className="text-emerald-500 flex items-center gap-1 font-medium">
                                        <CheckCircle2 className="w-3 h-3" /> Concluído
                                    </span>
                                ) : isBehind ? (
                                    <span className="text-amber-500 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Atrasado
                                    </span>
                                ) : (
                                    <span className="text-blue-500">Em andamento</span>
                                )
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}