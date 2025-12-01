'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, Loader2, Pencil } from "lucide-react";
import { upsertCategory } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { IconPicker } from './icon-picker'; 

interface CategoryModalProps {
  category?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryModal({ category, open: controlledOpen, onOpenChange }: CategoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || 'Tag');
  const [selectedColor, setSelectedColor] = useState(category?.color || '#3b82f6');

  const isEditing = !!category;
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('icon', selectedIcon);
    formData.set('color', selectedColor);

    setIsLoading(true);
    const result = await upsertCategory(formData, category?.id);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro ao salvar", { description: result.error });
    } else {
        toast.success(isEditing ? "Categoria atualizada!" : "Categoria criada!");
        setOpen(false);
    }
  }

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b'];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!onOpenChange && (
          <DialogTrigger asChild>
            {isEditing ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-4 h-4" />
                </Button>
            ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Nova Categoria
                </Button>
            )}
          </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] p-0 gap-0 rounded-xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-6 pb-8 transition-colors duration-300 flex flex-col items-center justify-center relative">
                <DialogHeader className="mb-6 w-full relative z-10">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider">
                        {isEditing ? "Editar Categoria" : "Nova Categoria"}
                    </DialogTitle>
                </DialogHeader>

                <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg bg-background border-4 border-white dark:border-slate-800 relative z-10 transition-transform hover:scale-105" 
                    style={{ color: selectedColor }}
                >
                    <IconPicker 
                        selected={selectedIcon} 
                        onSelect={(icon) => setSelectedIcon(icon)}
                        color={selectedColor} 
                        size="xl" 
                    />
                </div>
                
                <p className="text-xs text-muted-foreground mt-3 font-medium opacity-70">
                    Toque no ícone para alterar
                </p>
            </div>

            <div className="p-6 space-y-6 bg-card">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1 font-semibold uppercase">Nome da Categoria</Label>
                    <Input name="name" defaultValue={category?.name} placeholder="Ex: Alimentação, Lazer..." className="bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all h-11" required />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1 font-semibold uppercase">Tipo de Movimentação</Label>
                    <Select name="type" defaultValue={category?.type || 'EXPENSE'}>
                        <SelectTrigger className="bg-muted/50 border-transparent w-full h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EXPENSE">Despesa (Saída)</SelectItem>
                            <SelectItem value="INCOME">Receita (Entrada)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground ml-1 font-semibold uppercase">Cor da Tag</Label>
                    <div className="flex gap-3 flex-wrap justify-center bg-muted/30 p-4 rounded-xl border border-border/50 shadow-inner">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setSelectedColor(c)}
                                className={`w-8 h-8 rounded-full transition-all shadow-sm ${selectedColor === c ? 'ring-4 ring-offset-2 ring-primary scale-110' : 'hover:scale-110 hover:shadow-md'}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Selecionar cor ${c}`}
                            />
                        ))}
                    </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:opacity-90 rounded-xl mt-2">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Categoria')}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}