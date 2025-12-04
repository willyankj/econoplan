"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeft, ChevronRight, X, Check } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
    format,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    parseISO
} from "@/lib/date-utils"
import { ptBR } from "date-fns/locale"

interface DatePickerWithRangeProps {
  className?: string
  prefix?: string
  showMonthNavigation?: boolean
  keysToReset?: string[]
}

export function DatePickerWithRange({
  className,
  prefix = "",
  showMonthNavigation = true,
  keysToReset = []
}: DatePickerWithRangeProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [open, setOpen] = React.useState(false)

  // Chaves de URL
  const keyMonth = prefix ? `${prefix}Month` : 'month'
  const keyFrom = prefix ? `${prefix}From` : 'from'
  const keyTo = prefix ? `${prefix}To` : 'to'

  // Leitura de parâmetros
  const paramMonth = searchParams.get(keyMonth)
  const paramFrom = searchParams.get(keyFrom)
  const paramTo = searchParams.get(keyTo)

  const today = new Date()
  let dateRef = today

  // Determina a data de referência (para abrir o calendário no mês certo)
  if (paramMonth) {
    const [y, m] = paramMonth.split('-')
    dateRef = new Date(parseInt(y), parseInt(m) - 1, 1)
  } else if (paramFrom) {
    dateRef = parseISO(paramFrom)
  }

  // Estado local do range selecionado no calendário
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: paramFrom ? parseISO(paramFrom) : (paramMonth ? startOfMonth(dateRef) : undefined),
    to: paramTo ? parseISO(paramTo) : (paramMonth ? endOfMonth(dateRef) : undefined),
  })

  // Sincroniza estado interno se a URL mudar externamente
  React.useEffect(() => {
      if (paramFrom && paramTo) {
          setDateRange({ from: parseISO(paramFrom), to: parseISO(paramTo) })
      } else if (paramMonth) {
          // Se tiver mês, o range é implícito, mas visualmente no calendário podemos mostrar o mês inteiro
          const ref = new Date(parseInt(paramMonth.split('-')[0]), parseInt(paramMonth.split('-')[1]) - 1, 1)
          setDateRange({ from: startOfMonth(ref), to: endOfMonth(ref) })
      } else {
          // Default: Mês atual se nada estiver selecionado e for navegação padrão
          if (!prefix) {
             setDateRange({ from: startOfMonth(today), to: endOfMonth(today) })
          } else {
             setDateRange(undefined)
          }
      }
  }, [paramFrom, paramTo, paramMonth, prefix])


  // --- HANDLERS ---

  const clearKeys = (params: URLSearchParams) => {
    keysToReset.forEach(key => {
        params.delete(key);
        params.delete(`${key}Month`);
        params.delete(`${key}From`);
        params.delete(`${key}To`);
    });
  };

  const updateUrl = (newParams: URLSearchParams) => {
      clearKeys(newParams);
      router.push(`${pathname}?${newParams.toString()}`)
  }

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(dateRef, 1) : addMonths(dateRef, 1);
    const monthStr = format(newDate, 'yyyy-MM');

    const params = new URLSearchParams(searchParams.toString());
    params.set(keyMonth, monthStr);
    params.delete(keyFrom);
    params.delete(keyTo);

    updateUrl(params);
  };

  const applyRangeFilter = () => {
    if (dateRange?.from && dateRange?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(keyFrom, format(dateRange.from, 'yyyy-MM-dd'));
      params.set(keyTo, format(dateRange.to, 'yyyy-MM-dd'));
      params.delete(keyMonth);

      updateUrl(params);
      setOpen(false);
    }
  };

  const clearFilter = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const params = new URLSearchParams(searchParams.toString());
      params.delete(keyFrom);
      params.delete(keyTo);
      params.delete(keyMonth);

      updateUrl(params);
      setDateRange(undefined);
      setOpen(false);
  };

  // --- RENDER ---

  const isActive = !!(paramFrom && paramTo) || !!paramMonth;

  let label = "Selecionar Período";
  if (paramFrom && paramTo) {
    label = `${format(parseISO(paramFrom), "dd MMM")} - ${format(parseISO(paramTo), "dd MMM")}`;
  } else if (paramMonth) {
    label = format(dateRef, "MMMM 'de' yyyy", { locale: ptBR });
  } else if (!prefix) {
    // Se for o controle principal (sem prefixo), assume mês atual
    label = format(today, "MMMM 'de' yyyy", { locale: ptBR });
  }

  return (
    <div className={cn("flex items-center gap-1 bg-card p-1 rounded-lg border border-border shadow-sm", className)}>
      {showMonthNavigation && (
        <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('prev')} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-3 h-3" />
        </Button>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"ghost"}
            className={cn(
              "h-7 px-2 text-xs font-medium capitalize min-w-[140px] justify-center group relative",
              isActive && prefix ? "text-blue-500" : "",
              (!isActive && !prefix) && "text-foreground"
            )}
          >
            <CalendarIcon className={cn("mr-2 h-3 w-3 opacity-70", isActive && prefix && "text-blue-500")} />
            <span className="truncate max-w-[140px]">{label}</span>

            {prefix && isActive && (
                <div onClick={clearFilter} className="absolute right-1 p-0.5 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors z-10">
                    <X className="w-3 h-3" />
                </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
            <div className="flex flex-col w-full">
                <div className="p-3">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRef}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={1}
                        locale={ptBR}
                        fixedWeeks
                        className="rounded-md border shadow-sm bg-background"
                    />
                </div>
                <div className="p-2 border-t border-border bg-muted/10 flex justify-between items-center w-full">
                    <span className="text-[10px] text-muted-foreground pl-2 truncate max-w-[120px]">
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
                            onClick={applyRangeFilter}
                            disabled={!dateRange?.from || !dateRange?.to}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2"
                        >
                            <Check className="w-3 h-3 mr-1" /> Aplicar
                        </Button>
                    </div>
                </div>
            </div>
        </PopoverContent>
      </Popover>

      {showMonthNavigation && (
        <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('next')} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
