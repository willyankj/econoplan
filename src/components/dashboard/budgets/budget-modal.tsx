'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Loader2, Plus, Pencil } from "lucide-react";
import { upsertBudget } from '@/app/dashboard/actions';
import { toast } from "sonner";

interface BudgetModalProps {
  categories?: any[]; // Necessário para Criar
  budget?: any;       // Necessário para Editar
  open?: boolean;     // Controle externo (opcional)
  onOpenChange?: (open: boolean) => void;
}

export function BudgetModal({ categories = [], budget, open: controlledOpen, onOpenChange }: BudgetModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditing = !!budget;
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    const result = await upsertBudget(formData, budget?.id);
    
    setIsLoading(false);
    
    if (result?.error) {
        toast.error("Erro", { description: result.error });
    } else {
        toast.success(isEditing ? "Orçamento atualizado!" : "Orçamento definido!");
        setOpen(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {/* Se não houver controle externo, exibe o botão de trigger apropriado */}
      {!onOpenChange && (
        <DialogTrigger asChild>
            {isEditing ? (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3 h-3" />
                </Button>
            ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Definir Orçamento
                </Button>
            )}
        </DialogTrigger>
      )}
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            {isEditing ? `Editar: ${budget.categoryName}` : "Novo Orçamento Mensal"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          {/* Seleção de Categoria (Apenas na Criação) */}
          {!isEditing && (
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
          )}

          <div className="grid gap-2">
            <Label>Teto de Gastos (R$)</Label>
            <Input 
                name="amount" 
                type="number" 
                step="0.01" 
                defaultValue={budget?.target} 
                placeholder="Ex: 1000.00" 
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
                required 
            />
            <p className="text-xs text-muted-foreground">Valor máximo para gastar nesta categoria por mês.</p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Salvar Orçamento')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
