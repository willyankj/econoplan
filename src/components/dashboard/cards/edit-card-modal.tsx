'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2 } from "lucide-react";
import { updateCreditCard } from '@/app/dashboard/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankLogo } from "@/components/ui/bank-logo";

interface EditCardModalProps {
  card: any;
  accounts: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCardModal({ card, accounts, open, onOpenChange }: EditCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await updateCreditCard(card.id, formData);
    setIsLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CORES CORRIGIDAS */}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Editar Cartão
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Apelido</Label>
            <Input name="name" defaultValue={card.name} className="bg-muted border-border text-foreground" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Banco</Label>
                <Select name="bank" defaultValue={card.bank}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.bank}>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 overflow-hidden flex items-center justify-center">
                                <BankLogo bankName={acc.bank} className="w-4 h-4" />
                            </div>
                            {acc.bank}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label>Limite (R$)</Label>
                <Input name="limit" type="number" step="0.01" defaultValue={card.limit} className="bg-muted border-border text-foreground" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Fechamento</Label>
                <Input name="closingDay" type="number" min="1" max="31" defaultValue={card.closingDay} className="bg-muted border-border text-foreground" required />
            </div>
            <div className="grid gap-2">
                <Label>Vencimento</Label>
                <Input name="dueDay" type="number" min="1" max="31" defaultValue={card.dueDay} className="bg-muted border-border text-foreground" required />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}