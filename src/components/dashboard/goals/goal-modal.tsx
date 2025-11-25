'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, Plus, Pencil, Users } from "lucide-react";
import { createGoal, createSharedGoal, updateGoal } from '@/app/dashboard/actions'; // Importamos os aliases do actions.ts
import { toast } from "sonner";

interface GoalModalProps {
  goal?: any;           // Se existir, é Edição
  isShared?: boolean;   // Se true e for criação, cria meta compartilhada
}

export function GoalModal({ goal, isShared = false }: GoalModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!goal;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    
    try {
        if (isEditing) {
            await updateGoal(goal.id, formData);
            toast.success("Meta atualizada!");
        } else if (isShared) {
            await createSharedGoal(formData);
            toast.success("Meta compartilhada criada!");
        } else {
            await createGoal(formData);
            toast.success("Meta criada!");
        }
        setOpen(false);
    } catch (error) {
        toast.error("Erro ao salvar meta.");
    } finally {
        setIsLoading(false);
    }
  }

  const formattedDeadline = goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Pencil className="w-3 h-3" />
             </Button>
        ) : (
             <Button className={`${isShared ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white shadow-sm`}>
                <Plus className="w-4 h-4 mr-2" /> {isShared ? 'Nova Meta Conjunta' : 'Novo Objetivo'}
             </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            {isShared ? <Users className="w-5 h-5 text-purple-500" /> : <Target className="w-5 h-5 text-emerald-500" />}
            {isEditing ? "Editar Meta" : (isShared ? "Criar Meta da Organização" : "Criar Nova Meta")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          {isShared && !isEditing && (
            <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded text-xs text-purple-400 mb-2">
                Esta meta será visível para todos os membros e qualquer um poderá contribuir.
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Objetivo</Label>
            <Input 
                id="name" 
                name="name" 
                defaultValue={goal?.name}
                placeholder="Ex: Viagem, Reserva..." 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="targetAmount">Valor da Meta (R$)</Label>
                <Input 
                    id="targetAmount" 
                    name="targetAmount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={goal?.targetAmount}
                    placeholder="10000.00" 
                    className="bg-muted border-border text-foreground" 
                    required 
                />
            </div>
            {/* Campo 'Já tenho' só aparece na criação de meta pessoal */}
            {!isEditing && !isShared && (
                <div className="grid gap-2">
                    <Label htmlFor="currentAmount">Já tenho (R$)</Label>
                    <Input 
                        id="currentAmount" 
                        name="currentAmount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="bg-muted border-border text-foreground" 
                    />
                </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deadline">Prazo (Opcional)</Label>
            <Input 
                id="deadline" 
                name="deadline" 
                type="date" 
                defaultValue={formattedDeadline}
                className="bg-muted border-border text-foreground" 
            />
          </div>

          <Button type="submit" disabled={isLoading} className={`w-full text-white mt-2 ${isShared ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Meta')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
