'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { formatCurrency } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { InfoHelp } from "@/components/dashboard/info-help"; 

export function FinancialOracle({ data }: { data: any[] }) {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold mb-2 text-foreground">{label}</p>
          <div className="space-y-1">
             <p className="text-emerald-500">Entradas: {formatCurrency(payload[0]?.payload.income)}</p>
             <p className="text-rose-500">Saídas: {formatCurrency(payload[0]?.payload.expense)}</p>
             <div className="border-t border-border my-1 pt-1">
                 <p className="font-bold text-foreground">Saldo Previsto: {formatCurrency(payload[0]?.value)}</p>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border shadow-sm">
        <CardHeader>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">Oráculo Financeiro</CardTitle>
                            <InfoHelp title="Como funciona a projeção?">
                                <div className="space-y-3 text-sm">
                                    <p className="font-semibold text-amber-500">
                                        ⚠️ Nota: O filtro de data deve ser de no mínimo 3 meses para uma projeção precisa.
                                    </p>
                                    
                                    <p>O cálculo leva em consideração:</p>
                                    <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                                        <li>
                                            <strong className="text-foreground">Entradas:</strong> Receitas recorrentes (ex: Salários) + Lançamentos futuros agendados.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Saídas:</strong> Contas fixas mensais + Parcelas futuras de cartão de crédito + Despesas agendadas.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Saldo Previsto:</strong> Saldo atual acumulado com a movimentação prevista mês a mês.
                                        </li>
                                    </ul>
                                </div>
                            </InfoHelp>
                        </div>
                        <p className="text-sm text-muted-foreground">Projeção de fluxo de caixa futuro.</p>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
             {data.length === 0 ? (
                 <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                     Sem dados para projeção. Tente aumentar o filtro de data.
                 </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }} />
                        
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />

                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </ComposedChart>
                </ResponsiveContainer>
             )}
        </CardContent>
    </Card>
  );
}