'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export function DateMonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // 1. Ler parâmetros da URL
  const paramMonth = searchParams.get('month');
  const paramFrom = searchParams.get('from');
  const paramTo = searchParams.get('to');

  // 2. Determinar o estado atual
  const today = new Date();
  let dateRef = today;
  
  // Se tiver mês na URL, usa ele como referência
  if (paramMonth) {
    const [y, m] = paramMonth.split('-');
    dateRef = new Date(parseInt(y), parseInt(m) - 1, 1);
  } 
  // Se tiver Range, usa o 'from' como referência visual
  else if (paramFrom) {
    dateRef = parseISO(paramFrom);
  }

  // Estado do Range do Calendário
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: paramFrom ? parseISO(paramFrom) : startOfMonth(dateRef),
    to: paramTo ? parseISO(paramTo) : endOfMonth(dateRef),
  });

  // 3. Função para navegar apenas por Mês (Setas)
  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(dateRef, 1) : addMonths(dateRef, 1);
    const monthStr = format(newDate, 'yyyy-MM');
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', monthStr);
    params.delete('from'); // Limpa range personalizado ao usar setas
    params.delete('to');
    
    router.push(`${pathname}?${params.toString()}`);
  };

  // 4. Função ao selecionar no Calendário
  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from) {
      const params = new URLSearchParams(searchParams.toString());
      
      if (range.to) {
        // Se temos as duas datas, aplica o filtro e fecha o popover
        params.set('from', format(range.from, 'yyyy-MM-dd'));
        params.set('to', format(range.to, 'yyyy-MM-dd'));
        params.delete('month'); // Remove filtro de mês fixo
        router.push(`${pathname}?${params.toString()}`);
        // setOpen(false); // Opcional: fechar automático
      } else {
        // Se só tem a data inicial selecionada
        params.delete('month'); 
      }
    }
  };

  // 5. Texto de Exibição
  let label = "";
  if (paramFrom && paramTo) {
    // Exibe: 13 nov - 22 nov, 2025
    label = `${format(parseISO(paramFrom), "dd MMM", { locale: ptBR })} - ${format(parseISO(paramTo), "dd MMM, yyyy", { locale: ptBR })}`;
  } else {
    // Exibe: Novembro de 2025
    label = format(dateRef, "MMMM 'de' yyyy", { locale: ptBR });
  }

  return (
    <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border shadow-sm">
      <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('prev')} className="h-8 w-8">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-8 px-3 text-sm font-medium capitalize min-w-[160px] justify-center",
              (paramFrom && paramTo) && "text-emerald-500 hover:text-emerald-600"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRef}
            selected={dateRange}
            onSelect={handleRangeSelect}
            numberOfMonths={1} // <--- ALTERADO PARA 1 MÊS
            locale={ptBR}
            className="p-3"
          />
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('next')} className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}