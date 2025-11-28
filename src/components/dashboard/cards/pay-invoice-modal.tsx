'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { payCreditCardInvoice } from '@/app/dashboard/actions';
import { BankLogo } from "@/components/ui/bank-logo";
import { toast } from "sonner"; // <--- ADICIONADO

interface PayInvoiceProps {
  cardId: string;
  cardName: string;
  currentInvoice: number;
  accounts: any[];
}

export function PayInvoiceModal({ cardId, cardName, currentInvoice, accounts }: PayInvoiceProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.append('cardId', cardId);
    
    const result = await payCreditCardInvoice(formData);
    
    setIsLoading(false);

    // --- LÓGICA DE FEEDBACK ADICIONADA ---
    if (result?.error) {
        toast.error("Erro no pagamento", { description: result.error });
    } else {
        toast.success("Fatura paga com sucesso!");
        setOpen(false);
    }
  }

  const isInvoiceZero = currentInvoice <= 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500 hover:text-white"
          disabled={isInvoiceZero}
        >
            <CheckCircle2 className="w-4 h-4 mr-2" /> 
            Pagar Fatura
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1d24] border-slate-700 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white">Pagar Fatura: {cardName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="p-4 bg-slate-900 rounded-lg text-center border border-slate-800">
            <p className="text-xs text-slate-400 uppercase mb-1">Valor da Fatura</p>
            <p className="text-3xl font-bold text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentInvoice)}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accountId">Pagar com a conta</Label>
            <Select name="accountId" required>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d24] border-slate-700 text-slate-200">
                {accounts.length === 0 ? (
                   <SelectItem value="none" disabled>Nenhuma conta com saldo</SelectItem>
                ) : (
                  accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                          <div className="w-4 h-4 overflow-hidden flex items-center justify-center">
                              <BankLogo bankName={acc.bank} className="w-4 h-4" />
                          </div>
                          {acc.name}
                          <span className="text-xs text-slate-500 ml-auto">
                              (R$ {Number(acc.balance).toFixed(2)})
                          </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Valor do Pagamento</Label>
            <Input 
                id="amount" 
                name="amount" 
                type="number" 
                step="0.01" 
                defaultValue={currentInvoice.toFixed(2)} 
                className="bg-slate-900 border-slate-700 text-white" 
                required 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Data do Pagamento</Label>
            <Input 
                id="date" 
                name="date" 
                type="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                className="bg-slate-900 border-slate-700 text-white" 
                required 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Pagamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}