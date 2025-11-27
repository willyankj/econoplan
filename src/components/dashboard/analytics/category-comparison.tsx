'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ComparisonItem {
  category: string;
  current: number;
  average: number;
  diffPercent: number;
  status: string;
}

export function CategoryComparison({ data }: { data: ComparisonItem[] }) {
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">Comparativo Mensal</CardTitle>
        <p className="text-xs text-muted-foreground">Gasto atual vs Média de 3 meses</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados suficientes.</p>
        ) : (
            data.slice(0, 5).map((item) => (
                <div key={item.category} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.category}</span>
                        <span className="text-xs text-muted-foreground">
                             Média: {formatCurrency(item.average)}
                        </span>
                    </div>
                    
                    <div className="text-right">
                        <div className="font-bold text-sm">{formatCurrency(item.current)}</div>
                        <div className={`text-xs flex items-center justify-end gap-1 font-medium
                            ${item.status === 'danger' ? 'text-rose-500' : item.status === 'success' ? 'text-emerald-500' : 'text-muted-foreground'}
                        `}>
                            {item.status === 'danger' ? <ArrowUp className="w-3 h-3" /> : 
                             item.status === 'success' ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {Math.abs(item.diffPercent).toFixed(0)}%
                        </div>
                    </div>
                </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
