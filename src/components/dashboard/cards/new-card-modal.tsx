'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { createCreditCard } from '@/app/dashboard/actions';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BankLogo } from "@/components/ui/bank-logo";

export function NewCardModal({ accounts }: { accounts: any[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await createCreditCard(formData);
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Adicionar Cartão
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Apelido</Label>
            <Input name="name" placeholder="Ex: Nubank Platinum" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Instituição</Label>
                <Select name="bank" required>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    {accounts.length === 0 ? (
                        <SelectItem value="disabled" disabled>Crie uma conta antes</SelectItem>
                    ) : (
                        accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.bank}> 
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 overflow-hidden flex items-center justify-center">
                                    <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                </div>
                                {acc.bank}
                            </div>
                        </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Limite (R$)</Label>
                <Input name="limit" type="number" step="0.01" placeholder="5000.00" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Fechamento (Dia)</Label>
                <Input name="closingDay" type="number" min="1" max="31" placeholder="Ex: 05" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
            </div>
            <div className="grid gap-2">
                <Label>Vencimento (Dia)</Label>
                <Input name="dueDay" type="number" min="1" max="31" placeholder="Ex: 12" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Cartão'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}