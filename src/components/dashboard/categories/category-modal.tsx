'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertCategory } from '@/app/dashboard/actions/categories';
import { IconPicker } from './icon-picker';
import { toast } from "sonner";
import { Loader2, Plus, Pencil } from "lucide-react";

interface CategoryModalProps {
  category?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryModal({ category, open: controlledOpen, onOpenChange }: CategoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!category;

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Estados locais para os pickers
  const [icon, setIcon] = useState(category?.icon || "Tag");
  const [color, setColor] = useState(category?.color || "#94a3b8");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    const result = await upsertCategory(formData, category?.id);
    setIsLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? "Categoria atualizada!" : "Categoria criada!");
      setOpen(false);
      // Reset se for criação
      if (!isEditing) {
        setIcon("Tag");
        setColor("#94a3b8");
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
            {isEditing ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></Button>
            ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="w-4 h-4 mr-2" /> Nova Categoria</Button>
            )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input name="name" defaultValue={category?.name} required placeholder="Ex: Alimentação" className="bg-muted border-border" />
          </div>

          <div className="grid gap-2">
            <Label>Tipo</Label>
            {/* CORREÇÃO: Adicionado input hidden para garantir que o 'type' seja enviado na edição */}
            {isEditing && <input type="hidden" name="type" value={category?.type} />}
            
            <Select 
                name={isEditing ? undefined : "type"} 
                defaultValue={category?.type || "EXPENSE"} 
                disabled={isEditing}
            >
              <SelectTrigger className="bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Despesa</SelectItem>
                <SelectItem value="INCOME">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Ícone e Cor</Label>
            <IconPicker 
              selectedIcon={icon} 
              selectedColor={color} 
              onIconChange={setIcon} 
              onColorChange={setColor} 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
             {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}