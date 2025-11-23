'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { createAccount } from '@/app/dashboard/actions';
import { toast } from "sonner"; // <--- IMPORTANTE

export function NewAccountModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    // Captura a resposta da Server Action
    const result = await createAccount(formData);

    setIsLoading(false);

    // Verifica se deu erro
    if (result?.error) {
        toast.error("Acesso Negado", {
            description: result.error, // Mostra "Sem permissão..."
        });
        return; // Não fecha o modal
    }

    // Sucesso
    toast.success("Conta criada com sucesso!");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Conta
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Conta Bancária</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome da Conta</Label>
            <Input name="name" placeholder="Ex: Conta Principal" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
          </div>

          <div className="grid gap-2">
            <Label>Instituição (Banco)</Label>
            <Input name="bank" placeholder="Ex: Nubank, Itaú..." className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
          </div>

          <div className="grid gap-2">
            <Label>Saldo Inicial (R$)</Label>
            <Input name="balance" type="number" step="0.01" placeholder="0,00" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
            <p className="text-xs text-muted-foreground">O saldo atual que você já tem lá.</p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Conta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}