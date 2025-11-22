'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, Pencil } from "lucide-react";
import { updateGoal } from '@/app/dashboard/actions';

interface EditGoalProps {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    deadline: Date | null;
  };
}

export function EditGoalModal({ goal }: EditGoalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await updateGoal(goal.id, formData);
    setIsLoading(false);
    setOpen(false);
  }

  const formattedDeadline = goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
            <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      {/* CORREÇÃO DE CORES AQUI */}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            Editar Meta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome do Objetivo</Label>
            <Input 
                name="name" 
                defaultValue={goal.name} 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid gap-2">
            <Label>Valor da Meta (R$)</Label>
            <Input 
                name="targetAmount" 
                type="number" 
                step="0.01" 
                defaultValue={goal.targetAmount} 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid gap-2">
            <Label>Prazo (Opcional)</Label>
            <Input 
                name="deadline" 
                type="date" 
                defaultValue={formattedDeadline} 
                className="bg-muted border-border text-foreground" 
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