'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DateMonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentMonthStr = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const [year, month] = currentMonthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(date);
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);

    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newDate.toISOString().slice(0, 7));
    router.push(`${pathname}?${params.toString()}`);
  };

  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border shadow-sm">
      <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')} className="h-8 w-8">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium capitalize">{label}</span>
      </div>

      <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')} className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
