'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, PiggyBank } from "lucide-react";

interface TenantOverviewChartsProps {
  data: {
    chartData: any[];
    totals: {
      income: number;
      expense: number;
      transfer: number;
      investment: number;
    };
  };
}

export function TenantOverviewCharts({ data }: TenantOverviewChartsProps) {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
          <p className="text-muted-foreground mb-2 pb-2 border-b border-border font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => {
             if (entry.value === 0) return null;
             let label = "";
             let color = "";
             if (entry.dataKey === 'income') { label = "Receitas"; color = "text-emerald-500"; }
             if (entry.dataKey === 'expense') { label = "Despesas"; color = "text-rose-500"; }
             if (entry.dataKey === 'transfer') { label = "Transferências"; color = "text-blue-500"; }
             if (entry.dataKey === 'investment') { label = "Metas/Aportes"; color = "text-amber-500"; }

             return (
                <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
                <span className={`font-medium ${color}`}>{label}:</span>
                <span className="text-foreground font-bold">{formatCurrency(entry.value)}</span>
                </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-500"/> Receitas</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(data.totals.income)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-rose-500"/> Despesas</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(data.totals.expense)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ArrowRightLeft className="w-3 h-3 text-blue-500"/> Transferências</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(data.totals.transfer)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><PiggyBank className="w-3 h-3 text-amber-500"/> Metas/Aportes</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(data.totals.investment)}</span>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Evolução Financeira da Organização</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  {/* Gradients para Transfer e Investment */}
                  <linearGradient id="colorTransfer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" stackId="1" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" stackId="2" />
                {/* Novas Áreas (Empilhadas ou Sobrepostas - aqui coloquei separate stacks para clareza) */}
                <Area type="monotone" dataKey="investment" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorInvestment)" stackId="3" />
                <Area type="monotone" dataKey="transfer" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTransfer)" stackId="4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}