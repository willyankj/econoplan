'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface DateMonthSelectorProps {
  prefix?: string;
  keysToReset?: string[];
  className?: string;
  isIconTrigger?: boolean; 
}

export function DateMonthSelector({ prefix = "", keysToReset = [], className, isIconTrigger = false }: DateMonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const keyMonth = prefix ? `${prefix}Month` : 'month';
  const keyFrom = prefix ? `${prefix}From` : 'from';
  const keyTo = prefix ? `${prefix}To` : 'to';

  const paramMonth = searchParams.get(keyMonth);
  const paramFrom = searchParams.get(keyFrom);
  const paramTo = searchParams.get(keyTo);

  const today = new Date();
  let dateRef = today;
  
  if (paramMonth) {
    const [y, m] = paramMonth.split('-');
    dateRef = new Date(parseInt(y), parseInt(m) - 1, 1);
  } else if (paramFrom) {
    dateRef = parseISO(paramFrom);
  } else if (!prefix) {
    const globalFrom = searchParams.get('from');
    if (globalFrom && prefix) dateRef = parseISO(globalFrom);
  }

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: paramFrom ? parseISO(paramFrom) : startOfMonth(dateRef),
    to: paramTo ? parseISO(paramTo) : endOfMonth(dateRef),
  });

  const clearKeys = (params: URLSearchParams) => {
    keysToReset.forEach(key => {
        params.delete(key);
        params.delete(`${key}Month`);
        params.delete(`${key}From`);
        params.delete(`${key}To`);
    });
  };

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(dateRef, 1) : addMonths(dateRef, 1);
    const monthStr = format(newDate, 'yyyy-MM');
    const params = new URLSearchParams(searchParams.toString());
    params.set(keyMonth, monthStr);
    params.delete(keyFrom);
    params.delete(keyTo);
    clearKeys(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      const params = new URLSearchParams(searchParams.toString());
      if (range.to) {
        params.set(keyFrom, format(range.from, 'yyyy-MM-dd'));
        params.set(keyTo, format(range.to, 'yyyy-MM-dd'));
        params.delete(keyMonth);
        clearKeys(params);
        router.push(`${pathname}?${params.toString()}`);
        setOpen(false);
      } else {
        params.delete(keyMonth); 
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      const params = new URLSearchParams(searchParams.toString());
      params.delete(keyFrom);
      params.delete(keyTo);
      params.delete(keyMonth);
      router.push(`${pathname}?${params.toString()}`);
      setDateRange(undefined);
  };

  const isActive = !!(paramFrom && paramTo) || !!paramMonth;
  
  // MODO ÍCONE PURO (Para filtros específicos de card)
  if (isIconTrigger) {
      return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button 
                    className={cn(
                        "focus:outline-none transition-colors p-1 rounded-md hover:bg-muted", 
                        isActive ? "text-blue-500" : "text-muted-foreground hover:text-foreground",
                        className
                    )}
                    title="Filtrar este gráfico"
                >
                    <CalendarIcon className="w-4 h-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b border-border flex justify-between items-center bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">Período do Gráfico</span>
                    {isActive && (
                        <button onClick={handleClear} className="text-xs text-rose-500 hover:underline">
                            Limpar Filtro
                        </button>
                    )}
                </div>
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRef}
                    selected={dateRange}
                    onSelect={handleRangeSelect}
                    numberOfMonths={1}
                    locale={ptBR}
                    className="p-3"
                />
            </PopoverContent>
        </Popover>
      );
  }

  // MODO PADRÃO (Cabeçalho)
  let label = "";
  if (paramFrom && paramTo) {
    label = `${format(parseISO(paramFrom), "dd MMM", { locale: ptBR })} - ${format(parseISO(paramTo), "dd MMM", { locale: ptBR })}`;
  } else if (paramMonth) {
    label = format(dateRef, "MMMM 'de' yyyy", { locale: ptBR });
  } else {
    label = prefix ? "Seguir Geral" : format(today, "MMMM 'de' yyyy", { locale: ptBR });
  }

  return (
    <div className={cn("flex items-center gap-1 bg-card p-1 rounded-lg border border-border shadow-sm", className)}>
      <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('prev')} className="h-7 w-7">
        <ChevronLeft className="w-3 h-3" />
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-7 px-2 text-xs font-medium capitalize min-w-[140px] justify-center group relative",
              isActive && prefix ? "text-blue-500" : "",
              (!isActive && !prefix) && "text-foreground"
            )}
          >
            <CalendarIcon className={cn("mr-2 h-3 w-3 opacity-70", isActive && prefix && "text-blue-500")} />
            {label}
            {prefix && isActive && (
                <div onClick={handleClear} className="absolute right-1 p-0.5 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3 h-3" />
                </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRef}
            selected={dateRange}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
            locale={ptBR}
            className="p-3"
          />
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('next')} className="h-7 w-7">
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  );
}