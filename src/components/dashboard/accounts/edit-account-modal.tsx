'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";
import { updateAccount } from '@/app/dashboard/actions';

interface AccountData {
  id: string;
  name: string;
  bank: string;
  balance: number;
}

export function EditAccountModal({ account }: { account: AccountData }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await updateAccount(account.id, formData);
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 mr-1">
            <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      {/* CORREÇÃO DE CORES AQUI */}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Conta</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome da Conta</Label>
            <Input 
                name="name" 
                defaultValue={account.name} 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid gap-2">
            <Label>Instituição (Banco)</Label>
            <Input 
                name="bank" 
                defaultValue={account.bank} 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid gap-2">
            <Label>Saldo Atual (R$)</Label>
            <Input 
                name="balance" 
                type="number" 
                step="0.01" 
                defaultValue={account.balance}
                className="bg-muted border-border text-foreground" 
            />
            <p className="text-xs text-muted-foreground">Use para corrigir o saldo se estiver errado.</p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}