'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, Plus } from "lucide-react";
import { createGoal } from '@/app/dashboard/actions';

export function NewGoalModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    await createGoal(formData);
    
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Novo Objetivo
        </Button>
      </DialogTrigger>
      {/* CORREÇÃO DE CORES AQUI */}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            Criar Nova Meta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Objetivo</Label>
            <Input 
                id="name" 
                name="name" 
                placeholder="Ex: Reserva de Emergência, Viagem..." 
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
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
                    placeholder="10000.00" 
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
                    required 
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="currentAmount">Já tenho (R$)</Label>
                <Input 
                    id="currentAmount" 
                    name="currentAmount" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
                />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deadline">Prazo para alcançar (Opcional)</Label>
            <Input 
                id="deadline" 
                name="deadline" 
                type="date" 
                className="bg-muted border-border text-foreground" 
            />
            <p className="text-xs text-muted-foreground">
                Defina uma data para calcularmos sua meta mensal.
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Meta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}