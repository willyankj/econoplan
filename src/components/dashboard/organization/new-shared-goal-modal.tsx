'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, Plus, Users } from "lucide-react";
import { createSharedGoal } from '@/app/dashboard/actions'; // VAMOS CRIAR ESSA AÇÃO

export function NewSharedGoalModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    await createSharedGoal(formData); // Ação específica
    
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-500 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Nova Meta Conjunta
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Criar Meta da Organização
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded text-xs text-purple-300 mb-2">
            Esta meta será visível para todos os membros da organização e qualquer um poderá contribuir a partir de seus workspaces.
          </div>

          <div className="grid gap-2">
            <Label>Nome do Objetivo</Label>
            <Input name="name" placeholder="Ex: Viagem em Família, Sede Nova..." className="bg-muted border-border text-foreground" required />
          </div>

          <div className="grid gap-2">
            <Label>Valor da Meta (R$)</Label>
            <Input name="targetAmount" type="number" step="0.01" placeholder="0.00" className="bg-muted border-border text-foreground" required />
          </div>

          <div className="grid gap-2">
            <Label>Prazo (Opcional)</Label>
            <Input name="deadline" type="date" className="bg-muted border-border text-foreground" />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Meta Compartilhada'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
