'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Loader2, Plus } from "lucide-react";
import { createBudget } from '@/app/dashboard/actions';

export function NewBudgetModal({ categories }: { categories: any[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await createBudget(formData);
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Definir Orçamento
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            Novo Orçamento Mensal
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select name="categoryId" required>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Teto de Gastos (R$)</Label>
            <Input name="amount" type="number" step="0.01" placeholder="Ex: 1000.00" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
            <p className="text-xs text-muted-foreground">Valor máximo para gastar nesta categoria por mês.</p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Orçamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}