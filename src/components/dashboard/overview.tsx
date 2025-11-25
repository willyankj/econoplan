'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, ShieldCheck, PieChart, Calendar, Trophy, Target
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { formatCurrency } from "@/lib/utils"; // <--- Importado

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  chartData: { name: string; income: number; expense: number }[];
  lastTransactions: any[]; 
  budgets: { id: string; categoryName: string; target: number; spent: number }[];
  goals: any[];
  accounts: any[];
}

export function DashboardOverview({ data }: { data: DashboardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get('chartRange') || '6m';

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chartRange', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl">
          <p className="text-muted-foreground text-xs mb-2 pb-2 border-b border-border">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1 last:mb-0">
              <span className={`font-medium ${entry.name === 'Receitas' ? 'text-emerald-500' : 'text-rose-500'}`}>{entry.name}:</span>
              <span className="text-popover-foreground font-bold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
          <p className="text-muted-foreground">Dados em tempo real do <span className="text-emerald-500">Econoplan</span></p>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs flex items-center gap-1">
             <ShieldCheck className="w-3 h-3" /> Ambiente Seguro
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas (Mês)</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowUpRight className="w-4 h-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(data.monthlyIncome)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas (Mês)</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg"><ArrowDownRight className="w-4 h-4 text-rose-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(data.monthlyExpense)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm border-t-4 border-t-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <div className="p-2 bg-cyan-500/10 rounded-lg"><DollarSign className="w-4 h-4 text-cyan-500" /></div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totalBalance >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                {formatCurrency(data.totalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="lg:col-span-2 bg-card border-border shadow-sm">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg text-foreground">Fluxo de Caixa</h3>
            </div>
            <Select value={currentRange} onValueChange={handleRangeChange}>
                <SelectTrigger className="w-[160px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="30d">Últimos 30 Dias</SelectItem>
                    <SelectItem value="6m">Últimos 6 Meses</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="h-[300px] w-full px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Receitas" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          {/* WIDGET DE ORÇAMENTOS (LISTA) */}
          <Card className="bg-card border-border shadow-sm">
            <div className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" /> Orçamentos
                </h3>
                
                {data.budgets.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        Sem orçamentos definidos.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {data.budgets.map((budget) => {
                            const percent = Math.min((budget.spent / budget.target) * 100, 100);
                            let color = 'bg-emerald-500';
                            if (percent > 75) color = 'bg-amber-500';
                            if (percent >= 100) color = 'bg-rose-500';
                            
                            return (
                                <div key={budget.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-foreground text-sm font-medium truncate max-w-[120px]">{budget.categoryName}</span>
                                        <span className="text-muted-foreground">{percent.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                                        {formatCurrency(budget.spent)} / {formatCurrency(budget.target)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
          </Card>

          {/* WIDGET METAS */}
          <Card className="bg-card border-border shadow-sm">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" /> Metas em Foco
                    </h3>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500 hover:text-blue-400" onClick={() => router.push('/dashboard/goals')}>
                        Ver todas
                    </Button>
                </div>

                {data.goals.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhum objetivo criado.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.goals.map(goal => {
                            const percent = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
                            return (
                                <div key={goal.id} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-foreground font-medium">{goal.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                            <div className="transform scale-75 origin-right">
                                                <DepositGoalModal 
                                                    goal={goal} 
                                                    accounts={data.accounts} 
                                                    type="DEPOSIT" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Progress value={percent} className="h-1.5" />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}