'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Corrigido para Select do shadcn
import { PieChart, Plus, Loader2, Pencil } from "lucide-react"; // Ícones atualizados
import { upsertBudget } from '@/app/dashboard/actions';
import { toast } from "sonner";
// Se tiver o componente de CategoryCombobox, pode usar, mas vou usar Select simples para manter consistência
import { CategoryCombobox } from "@/components/dashboard/categories/category-combobox"; 

interface BudgetModalProps {
  budget?: any;
  categories: any[];
}

export function BudgetModal({ budget, categories }: BudgetModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!budget;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsLoading(true);
    
    try {
        await upsertBudget(formData, budget?.id);
        toast.success(isEditing ? "Orçamento atualizado!" : "Orçamento definido!");
        setOpen(false);
    } catch (e) {
        toast.error("Erro ao salvar orçamento.");
    } finally {
        setIsLoading(false);
    }
  }

  // Configuração Visual
  const themeColor = "text-blue-500";
  const themeBg = "bg-blue-600";
  const themeLightBg = "bg-blue-50 dark:bg-blue-950/20";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-500"><Pencil className="w-4 h-4" /></Button>
        ) : (
            <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
            </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] p-0 gap-0 rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        {isEditing ? "Ajustar Teto" : "Definir Limite de Gastos"}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input 
                        name="amount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        defaultValue={budget?.targetAmount} 
                        className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        autoFocus={!isEditing}
                        required
                    />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Qual o máximo que você quer gastar?</p>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Categoria do Orçamento</Label>
                    {/* Se estiver editando, não permite trocar a categoria para evitar conflitos, ou use hidden input */}
                    {isEditing ? (
                        <div className="flex items-center h-11 px-3 w-full rounded-md bg-muted/50 border border-transparent text-sm text-foreground font-medium">
                            {budget.categoryName || budget.category?.name}
                            <input type="hidden" name="categoryId" value={budget.categoryId} />
                        </div>
                    ) : (
                        <CategoryCombobox 
                            categories={categories.filter(c => c.type === 'EXPENSE')} 
                            name="categoryId" 
                        />
                    )}
                </div>

                <Button type="submit" disabled={isLoading} className={`w-full text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02] ${themeBg} hover:opacity-90`}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Definir Orçamento')}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}