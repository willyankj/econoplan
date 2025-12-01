'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { InfoHelp } from "@/components/dashboard/info-help"; 

const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

interface TenantChartsProps {
  workspaceData: { name: string; expense: number; income: number }[];
  categoryData: { name: string; value: number }[];
}

export function TenantOverviewCharts({ workspaceData, categoryData }: TenantChartsProps) {
  const sortedWorkspaces = [...workspaceData].sort((a, b) => b.expense - a.expense);
  const topCategories = [...categoryData].sort((a, b) => b.value - a.value).slice(0, 5);
  const maxCategoryValue = topCategories[0]?.value || 1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold mb-1 text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
             <p key={index} style={{ color: entry.color }}>
                {entry.name}: {currency(entry.value)}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
             <CardTitle className="text-lg text-foreground">Fluxo por Workspace</CardTitle>
             <InfoHelp title="Comparativo entre Áreas">
                Mostra quanto cada workspace (Pessoal, Empresa, Família) recebeu e gastou. Ajuda a entender quem é o maior responsável pelos custos.
             </InfoHelp>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedWorkspaces} layout="vertical" margin={{ left: 0, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" hide />
              {/* Aumentado width de 100 para 140 para caber nomes maiores */}
              <YAxis dataKey="name" type="category" width={140} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
              <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
              <CardTitle className="text-lg text-foreground">Top 5 Categorias</CardTitle>
              <InfoHelp title="Onde o dinheiro vai?">
                  Ranking das categorias onde você mais gastou em toda a organização.
              </InfoHelp>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
            {topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Sem dados de despesas.</p>
            ) : (
                topCategories.map((cat, idx) => {
                    const percent = (cat.value / maxCategoryValue) * 100;
                    const color = COLORS[idx % COLORS.length];
                    return (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="font-medium text-foreground">{cat.name}</span>
                                </div>
                                <span className="text-muted-foreground">{currency(cat.value)}</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
                            </div>
                        </div>
                    )
                })
            )}
        </CardContent>
      </Card>
    </div>
  );
}