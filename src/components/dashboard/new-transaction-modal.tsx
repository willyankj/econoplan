'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, CreditCard, Landmark } from "lucide-react";
import { createTransaction } from '@/app/dashboard/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankLogo } from "@/components/ui/bank-logo";

export function NewTransactionModal({ accounts, cards }: { accounts: any[], cards: any[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ACCOUNT' | 'CREDIT_CARD'>('ACCOUNT');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  // Bloqueia cartão se for Receita
  useEffect(() => {
    if (type === 'INCOME') {
      setPaymentMethod('ACCOUNT');
    }
  }, [type]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.append('type', type);
    formData.append('paymentMethod', paymentMethod);

    await createTransaction(formData);
    
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all">
            <Plus className="w-4 h-4" />
            Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          {/* TIPO */}
          <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${type === 'INCOME' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Despesa
            </button>
          </div>

          {/* ABAS */}
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
              <TabsTrigger 
                value="ACCOUNT" 
                className="text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <Landmark className="w-4 h-4 mr-2" /> Conta / Pix
              </TabsTrigger>
              
              <TabsTrigger 
                value="CREDIT_CARD"
                disabled={type === 'INCOME'}
                className={`text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground transition-colors ${type === 'INCOME' ? 'opacity-50 cursor-not-allowed' : 'hover:text-foreground'}`}
              >
                <CreditCard className="w-4 h-4 mr-2" /> Cartão
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
                {/* ABA CONTA */}
                <TabsContent value="ACCOUNT" className="space-y-4 mt-0">
                    <div className="grid gap-2">
                        <Label>Conta de {type === 'INCOME' ? 'Entrada' : 'Saída'}</Label>
                        <Select name="accountId" required={paymentMethod === 'ACCOUNT'}>
                            <SelectTrigger className="bg-muted border-border text-foreground">
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-card-foreground">
                                {accounts.length === 0 ? (
                                   <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                                ) : (
                                  accounts.map(acc => (
                                      <SelectItem key={acc.id} value={acc.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 overflow-hidden flex items-center justify-center">
                                            <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                          </div>
                                          {acc.name}
                                        </div>
                                      </SelectItem>
                                  ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </TabsContent>

                {/* ABA CARTÃO */}
                <TabsContent value="CREDIT_CARD" className="space-y-4 mt-0">
                    <div className="grid gap-2">
                        <Label>Cartão Utilizado</Label>
                        <Select name="cardId" required={paymentMethod === 'CREDIT_CARD'}>
                            <SelectTrigger className="bg-muted border-border text-foreground">
                                <SelectValue placeholder="Selecione o cartão" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-card-foreground">
                                {cards.length === 0 ? (
                                   <SelectItem value="none" disabled>Nenhum cartão cadastrado</SelectItem>
                                ) : (
                                  cards.map(card => (
                                      <SelectItem key={card.id} value={card.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 overflow-hidden flex items-center justify-center">
                                            <BankLogo bankName={card.bank} className="w-4 h-4" />
                                          </div>
                                          {card.name}
                                        </div>
                                      </SelectItem>
                                  ))
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          A despesa entrará na fatura do mês correspondente.
                        </p>
                    </div>
                </TabsContent>
            </div>
          </Tabs>

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input name="description" placeholder={type === 'INCOME' ? "Ex: Salário..." : "Ex: Mercado..."} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input name="amount" type="number" step="0.01" placeholder="0,00" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
            </div>
            <div className="grid gap-2">
                <Label>Data</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-muted border-border text-foreground" required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Input name="category" placeholder={type === 'INCOME' ? "Ex: Salário" : "Ex: Alimentação"} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Lançamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}