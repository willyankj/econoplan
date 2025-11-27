'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import { InfoHelp } from "@/components/dashboard/info-help"; // <--- Padrão Unificado

const COLORS = ['#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#06b6d4'];

export function DebtXRay({ data, cardNames }: { data: any[], cardNames: string[] }) {

  const totalDebt = data.reduce((acc, cur) => acc + cur.total, 0);

  return (
    <Card className="bg-card border-border shadow-sm">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">Raio-X de Faturas</CardTitle>
                            <InfoHelp title="Comprometimento Futuro">
                                <p>Este gráfico mostra quanto da sua renda futura já está "presa" em faturas de cartão.</p>
                                <p className="mt-2">Cada barra representa o <strong>valor total das faturas</strong> que vencerão naquele mês (compras parceladas).</p>
                            </InfoHelp>
                        </div>
                        <p className="text-sm text-muted-foreground">Previsão de faturas futuras.</p>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground uppercase">Total Parcelado</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(totalDebt)}</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
             {data.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--popover-foreground))', fontSize: '12px' }}
                            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                            formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        
                        {cardNames.map((card, index) => (
                            <Bar 
                                key={card} 
                                dataKey={card} 
                                stackId="a" 
                                fill={COLORS[index % COLORS.length]} 
                                radius={index === cardNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                            />
                        ))}
                    </BarChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="h-full flex items-center justify-center text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed border-border/50">
                     Nenhuma compra parcelada futura encontrada.
                 </div>
             )}
        </CardContent>
    </Card>
  );
}