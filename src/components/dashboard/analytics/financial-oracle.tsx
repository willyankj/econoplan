'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { formatCurrency } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { InfoHelp } from "@/components/dashboard/info-help"; // <--- Padrão Unificado

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
                            <InfoHelp title="Como funciona a previsão?">
                                O gráfico projeta seu saldo futuro baseando-se em:
                                <ul className="list-disc pl-4 mt-2 mb-2 space-y-1">
                                    <li>Saldo atual das contas;</li>
                                    <li>Receitas e despesas recorrentes (fixas);</li>
                                    <li>Parcelas futuras de cartão de crédito.</li>
                                </ul>
                                <span className="text-rose-400">
                                    Se a linha cair abaixo de zero, há risco de saldo negativo.
                                </span>
                            </InfoHelp>
                        </div>
                        <p className="text-sm text-muted-foreground">Projeção de saldo para 6 meses.</p>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
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
        </CardContent>
    </Card>
  );
}