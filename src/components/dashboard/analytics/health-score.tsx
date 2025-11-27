'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { InfoHelp } from "@/components/dashboard/info-help"; // Importar

export function HealthScore({ score, metrics }: { score: number, metrics: any }) {
  
  let color = 'text-rose-500';
  let label = 'Crítico';
  if (score >= 50) { color = 'text-yellow-500'; label = 'Atenção'; }
  if (score >= 70) { color = 'text-emerald-500'; label = 'Saudável'; }
  if (score >= 90) { color = 'text-blue-500'; label = 'Excelente'; }

  return (
    <Card className="bg-card border-border shadow-sm relative overflow-hidden h-full">
        <div className={`absolute top-0 left-0 w-1 h-full ${color.replace('text-', 'bg-')}`} />
        <div className="absolute top-4 right-4">
            <InfoHelp title="Como é calculado?">
                Nota de 0 a 100 baseada em 3 pilares:
                <br/>• Poupança Mensal (40pts)
                <br/>• Cobertura de Reserva (40pts)
                <br/>• Aderência ao Orçamento (20pts)
            </InfoHelp>
        </div>

        <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-muted/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className={color} strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-2xl font-bold ${color}`}>{score}</span>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                    <Gauge className="w-5 h-5 text-muted-foreground" />
                    Saúde Financeira
                </h3>
                <p className={`font-medium ${color}`}>{label}</p>
                <p className="text-xs text-muted-foreground mt-2 px-4">
                    {metrics.coverageMonths < 1 
                        ? "Cuidado: Sua reserva atual cobre menos de 1 mês de despesas." 
                        : `Ótimo! Sua reserva garante ${metrics.coverageMonths.toFixed(1)} meses de tranquilidade.`}
                </p>
            </div>
        </CardContent>
    </Card>
  );
}