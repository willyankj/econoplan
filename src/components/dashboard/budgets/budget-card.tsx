'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, ExternalLink } from "lucide-react";
import { deleteBudget } from "@/app/dashboard/actions";
import { BudgetModal } from "./budget-modal"; // <--- NOVO
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface BudgetCardProps {
  budget: {
    id: string;
    categoryId: string | null;
    categoryName: string;
    target: number;
    spent: number;
    dateFrom: string;
    dateTo: string;
  }
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const percentage = Math.min((budget.spent / budget.target) * 100, 100);
  const isOverBudget = budget.spent > budget.target;
  
  let progressColor = 'bg-emerald-500';
  if (percentage > 75) progressColor = 'bg-amber-500';
  if (percentage >= 100) progressColor = 'bg-rose-500';

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;
    setIsLoading(true);
    const result = await deleteBudget(budget.id);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro ao excluir", { description: result.error });
    } else {
        toast.success("Orçamento removido.");
    }
  };

  const detailsUrl = `/dashboard/transactions?categoryId=${budget.categoryId}&from=${budget.dateFrom}&to=${budget.dateTo}`;

  return (
    <>
      <Card className="relative overflow-hidden bg-card border-border shadow-sm hover:border-primary/50 transition-all group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full -mr-6 -mt-6 pointer-events-none" />

        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
             {budget.categoryName}
             <Link href={detailsUrl}>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" />
                </Button>
             </Link>
          </CardTitle>
          
          <div className="flex items-center gap-1">
            {/* BOTÃO EDITAR AGORA ABRE O MODAL UNIFICADO */}
            <BudgetModal budget={budget} open={showEdit} onOpenChange={setShowEdit} />
            
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="flex justify-between items-end">
              <div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(budget.spent)}</p>
                  <p className="text-xs text-muted-foreground">Gasto este mês</p>
              </div>
              <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">de {formatCurrency(budget.target)}</p>
                  <p className={`text-xs ${isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isOverBudget ? 'Orçamento estourado!' : `${(100 - percentage).toFixed(0)}% disponível`}
                  </p>
              </div>
          </div>

          <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${percentage}%` }} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}