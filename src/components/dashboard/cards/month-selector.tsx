'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MonthSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentMonthStr = searchParams.get('month') || format(new Date(), 'yyyy-MM');
    const currentDate = parseISO(currentMonthStr + "-01");

    const handleNav = (direction: 'prev' | 'next') => {
        const newDate = addMonths(currentDate, direction === 'next' ? 1 : -1);
        const newMonthStr = format(newDate, 'yyyy-MM');

        const params = new URLSearchParams(searchParams.toString());
        params.set('month', newMonthStr);
        router.push(`?${params.toString()}`);
    };

    const handleReset = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('month');
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => handleNav('prev')}>
                <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex flex-col items-center min-w-[140px]">
                <span className="text-sm font-bold capitalize flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => handleNav('next')}>
                <ChevronRight className="w-4 h-4" />
            </Button>

            {(searchParams.get('month')) && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="ml-2 text-xs text-muted-foreground">
                    Hoje
                </Button>
            )}
        </div>
    );
}
