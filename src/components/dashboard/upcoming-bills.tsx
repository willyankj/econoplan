'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BankLogo } from "@/components/ui/bank-logo";
import { getIcon } from "@/lib/icons";
import { isToday, isTomorrow, isPast, isSameDay, addDays } from "date-fns";

interface Bill {
  id: string;
  description: string;
  amount: number;
  date: string;
  isCard: boolean;
  bank?: string;
  category?: { name: string; icon?: string; color?: string };
}

export function UpcomingBills({ bills }: { bills: Bill[] }) {
  
  const getDateLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      // Ajusta fuso horário simples removendo horas para comparação de dia
      const today = new Date();
      
      if (isSameDay(date, today)) return { text: "Hoje", color: "text-amber-500 font-bold" };
      if (isTomorrow(date)) return { text: "Amanhã", color: "text-blue-500 font-medium" };
      if (isPast(date) && !isSameDay(date, today)) return { text: "Atrasado", color: "text-rose-500 font-bold" };
      
      return { 
          text: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), 
          color: "text-muted-foreground" 
      };
  };

  return (
    <Card className="bg-card border-border shadow-sm h-full flex flex-col">
        <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
                        <p className="text-xs text-muted-foreground">Contas para os próximos 30 dias</p>
                    </div>
                </div>
                <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full">
                    {bills.length} pendentes
                </span>
            </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto pr-2 scrollbar-thin min-h-[300px]">
            {bills.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-3 opacity-60">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    <p className="text-sm">Tudo pago! Nenhuma conta próxima.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bills.map(bill => {
                        const { text, color } = getDateLabel(bill.date);
                        const Icon = getIcon(bill.category?.icon);
                        
                        return (
                            <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {/* Ícone: Se for cartão mostra Logo do Banco, se não, Ícone da Categoria */}
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border shrink-0">
                                        {bill.isCard && bill.bank ? (
                                            <BankLogo bankName={bill.bank} className="w-6 h-6" />
                                        ) : (
                                            <Icon className="w-5 h-5" style={{ color: bill.category?.color || '#94a3b8' }} />
                                        )}
                                    </div>
                                    
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                                            {bill.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {bill.category?.name || 'Geral'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0 pl-2">
                                    <p className="text-sm font-bold text-foreground">
                                        {formatCurrency(bill.amount)}
                                    </p>
                                    <p className={`text-[10px] uppercase tracking-wide ${color}`}>
                                        {text}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CardContent>
    </Card>
  );
}
