'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check } from "lucide-react";
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
  };

  const applyFilter = () => {
    if (dateRange?.from && dateRange?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(keyFrom, format(dateRange.from, 'yyyy-MM-dd'));
      params.set(keyTo, format(dateRange.to, 'yyyy-MM-dd'));
      params.delete(keyMonth);
      clearKeys(params);
      router.push(`${pathname}?${params.toString()}`);
      setOpen(false);
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
      if(isIconTrigger) setOpen(false);
  };

  const isActive = !!(paramFrom && paramTo) || !!paramMonth;
  
  // --- CONTEÚDO DO POPOVER ---
  const PopoverContentInternal = () => (
    <div className="flex flex-col w-full">
        {isIconTrigger && (
            <div className="p-3 border-b border-border flex justify-between items-center bg-muted/30 w-full">
                <span className="text-xs font-medium text-muted-foreground">Período do Gráfico</span>
                {isActive && (
                    <button onClick={handleClear} className="text-xs text-rose-500 hover:underline">
                        Limpar
                    </button>
                )}
            </div>
        )}
        
        {/* Container do calendário centralizado */}
        <div className="p-3 flex justify-center w-full">
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRef}
                selected={dateRange}
                onSelect={handleRangeSelect}
                numberOfMonths={1}
                locale={ptBR}
                fixedWeeks
                className="rounded-md border shadow-sm bg-background"
            />
        </div>

        <div className="p-2 border-t border-border bg-muted/10 flex justify-between items-center w-full">
             <span className="text-[10px] text-muted-foreground pl-2 truncate max-w-[120px]" title={dateRange?.from ? "Período selecionado" : "Selecione"}>
                {dateRange?.from ? (
                    dateRange.to ? 
                    `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}` : 
                    `${format(dateRange.from, 'dd/MM')} - ...`
                ) : "Selecione"}
             </span>
             <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-7 text-xs px-2">Cancelar</Button>
                <Button 
                    size="sm" 
                    onClick={applyFilter} 
                    disabled={!dateRange?.from || !dateRange?.to}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2"
                >
                    <Check className="w-3 h-3 mr-1" /> Aplicar
                </Button>
             </div>
        </div>
    </div>
  );

  // MODO ÍCONE PURO
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
            {/* CORREÇÃO: Largura fixa e alinhamento */}
            <PopoverContent className="w-[320px] p-0" align="start">
                <PopoverContentInternal />
            </PopoverContent>
        </Popover>
      );
  }

  // MODO PADRÃO
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
        
        {/* CORREÇÃO: Largura fixa e alinhamento */}
        <PopoverContent className="w-[320px] p-0" align="end">
            <PopoverContentInternal />
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('next')} className="h-7 w-7">
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  );
}