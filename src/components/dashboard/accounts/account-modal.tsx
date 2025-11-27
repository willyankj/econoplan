'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { upsertAccount } from '@/app/dashboard/actions'; 
import { toast } from "sonner";

interface AccountModalProps {
  account?: { id: string; name: string; bank: string; balance: number };
}

export function AccountModal({ account }: AccountModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!account;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // --- VALIDAÇÃO MANUAL PADRONIZADA ---
    const name = formData.get("name")?.toString().trim();
    const bank = formData.get("bank")?.toString().trim();

    if (!name) return toast.error("O nome da conta é obrigatório.");
    if (!bank) return toast.error("O nome do banco/instituição é obrigatório.");
    // -------------------------------------

    setIsLoading(true);
    const result = await upsertAccount(formData, account?.id);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro ao salvar conta", { description: result.error });
    } else {
        toast.success(isEditing ? "Conta atualizada com sucesso!" : "Conta criada com sucesso!");
        setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 mr-1">
                <Pencil className="w-4 h-4" />
            </Button>
        ) : (
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Conta
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome da Conta</Label>
            <Input 
                name="name" 
                defaultValue={account?.name} 
                placeholder="Ex: Conta Principal" 
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="grid gap-2">
            <Label>Instituição (Banco)</Label>
            <Input 
                name="bank" 
                defaultValue={account?.bank} 
                placeholder="Ex: Nubank" 
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="grid gap-2">
            <Label>Saldo Atual (R$)</Label>
            <Input 
                name="balance" 
                type="number" 
                step="0.01" 
                defaultValue={account?.balance} 
                placeholder="0.00" 
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Conta')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}