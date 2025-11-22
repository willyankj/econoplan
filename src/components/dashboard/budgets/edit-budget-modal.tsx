'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Loader2 } from "lucide-react";
import { updateBudget } from '@/app/dashboard/actions';

interface EditBudgetModalProps {
  budget: {
    id: string;
    categoryName: string;
    target: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBudgetModal({ budget, open, onOpenChange }: EditBudgetModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await updateBudget(budget.id, formData);
    setIsLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            Editar Orçamento: {budget.categoryName}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Novo Teto de Gastos (R$)</Label>
            <Input 
                name="amount" 
                type="number" 
                step="0.01" 
                defaultValue={budget.target} 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}