'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Loader2, CreditCard, Landmark } from "lucide-react";
import { upsertTransaction } from '@/app/dashboard/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryCombobox } from '@/components/dashboard/categories/category-combobox';
import { BankLogo } from "@/components/ui/bank-logo"; 
import { toast } from "sonner"; // Garante o import do Sonner

interface Props {
  transaction?: any;
  accounts?: any[];
  cards?: any[];
  categories?: any[];
}

export function TransactionModal({ transaction, accounts = [], cards = [], categories = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('ACCOUNT');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const isEditing = !!transaction;
  const currentType = isEditing ? transaction.type : type;
  
  const availableCategories = categories.filter(c => c.type === currentType);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // --- VALIDAÇÃO MANUAL PADRONIZADA ---
    const description = formData.get("description")?.toString().trim();
    const amount = formData.get("amount")?.toString();
    const date = formData.get("date")?.toString();
    const category = formData.get("category")?.toString();

    if (!description) return toast.error("A descrição é obrigatória.");
    if (!amount || Number(amount) <= 0) return toast.error("O valor deve ser maior que zero.");
    if (!date) return toast.error("A data é obrigatória.");
    if (!category) return toast.error("Selecione uma categoria.");

    if (!isEditing) {
        const method = formData.get("paymentMethod"); // Hidden field logic handled by state usually, checking manual logic
        // Validação específica de conta/cartão
        if (paymentMethod === 'ACCOUNT' && !formData.get("accountId")) return toast.error("Selecione uma conta bancária.");
        if (paymentMethod === 'CREDIT_CARD' && !formData.get("cardId")) return toast.error("Selecione um cartão de crédito.");
    }
    // -------------------------------------

    setIsLoading(true);
    
    if (!isEditing) {
        formData.append('type', type);
        formData.append('paymentMethod', paymentMethod);
    } else {
        formData.append('type', transaction.type);
    }

    const result = await upsertTransaction(formData, transaction?.id);
    setIsLoading(false);

    if (result?.error) toast.error(result.error);
    else {
        toast.success(isEditing ? "Transação atualizada com sucesso!" : "Transação criada com sucesso!");
        setOpen(false);
    }
  }

  const defaultDate = transaction ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600">
                <Pencil className="w-4 h-4" />
            </Button>
        ) : (
            <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Nova Transação
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transação" : "Nova Transação"}</DialogTitle>
        </DialogHeader>
        
        {/* removemos 'required' dos inputs para o toast assumir o controle */}
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          {!isEditing && (
             <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                <button type="button" onClick={() => setType('INCOME')} className={`py-2 rounded-md text-sm font-medium transition-all ${type === 'INCOME' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Receita</button>
                <button type="button" onClick={() => setType('EXPENSE')} className={`py-2 rounded-md text-sm font-medium transition-all ${type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Despesa</button>
             </div>
          )}

          {!isEditing && (
             <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border p-1">
                    <TabsTrigger value="ACCOUNT" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground/70">
                        <Landmark className="w-4 h-4 mr-2" /> Conta
                    </TabsTrigger>
                    <TabsTrigger value="CREDIT_CARD" disabled={type === 'INCOME'} className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground/70">
                        <CreditCard className="w-4 h-4 mr-2" /> Cartão
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ACCOUNT" className="mt-3">
                    <Select name="accountId">
                        <SelectTrigger className="bg-muted/50 border-border text-foreground font-medium h-11">
                            <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 flex items-center justify-center rounded bg-white/5 p-0.5">
                                            <BankLogo bankName={a.bank} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-foreground font-medium">{a.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TabsContent>

                <TabsContent value="CREDIT_CARD" className="mt-3">
                    <Select name="cardId">
                        <SelectTrigger className="bg-muted/50 border-border text-foreground font-medium h-11">
                            <SelectValue placeholder="Selecione o cartão" />
                        </SelectTrigger>
                        <SelectContent>
                            {cards.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 flex items-center justify-center rounded bg-white/5 p-0.5">
                                            <BankLogo bankName={c.bank} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-foreground font-medium">{c.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TabsContent>
             </Tabs>
          )}

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input name="description" defaultValue={transaction?.description} className="bg-muted/50 border-border text-foreground h-11" placeholder="Ex: Compras do mês" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input name="amount" type="number" step="0.01" defaultValue={transaction ? Number(transaction.amount) : ''} className="bg-muted/50 border-border text-foreground h-11 font-bold" placeholder="0,00" />
            </div>
            <div className="grid gap-2">
                <Label>Data</Label>
                <Input name="date" type="date" defaultValue={defaultDate} className="bg-muted/50 border-border text-foreground h-11" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <CategoryCombobox 
                categories={availableCategories} 
                type={currentType}
                defaultValue={transaction?.category?.name || ''}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2 h-11 font-semibold text-base">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Confirmar Transação')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}