'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { upsertTransaction } from '@/app/dashboard/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Props {
  transaction?: any; // Se existir, é EDIT
  accounts?: any[]; // Necessário para CREATE
  cards?: any[];    // Necessário para CREATE
}

export function TransactionModal({ transaction, accounts = [], cards = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para CREATE
  const [paymentMethod, setPaymentMethod] = useState('ACCOUNT');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const isEditing = !!transaction;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    // Se for CREATE, adiciona dados extras que não estão nos inputs visíveis
    if (!isEditing) {
        formData.append('type', type);
        formData.append('paymentMethod', paymentMethod);
    } else {
        // No edit, enviamos os dados originais para manter consistência
        formData.append('type', transaction.type);
    }

    const result = await upsertTransaction(formData, transaction?.id);
    setIsLoading(false);

    if (result?.error) toast.error(result.error);
    else {
        toast.success(isEditing ? "Atualizado!" : "Criado!");
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
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          {/* SELETORES DE TIPO (SÓ APARECEM NO CREATE) */}
          {!isEditing && (
             <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                {/* Botões Receita/Despesa ... */}
                <button type="button" onClick={() => setType('INCOME')} className={`py-2 rounded text-sm ${type === 'INCOME' ? 'bg-emerald-600 text-white' : ''}`}>Receita</button>
                <button type="button" onClick={() => setType('EXPENSE')} className={`py-2 rounded text-sm ${type === 'EXPENSE' ? 'bg-rose-600 text-white' : ''}`}>Despesa</button>
             </div>
          )}

          {/* ABAS CONTA/CARTÃO (SÓ APARECEM NO CREATE) */}
          {!isEditing && (
             <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ACCOUNT">Conta</TabsTrigger>
                    <TabsTrigger value="CREDIT_CARD" disabled={type === 'INCOME'}>Cartão</TabsTrigger>
                </TabsList>
                <TabsContent value="ACCOUNT">
                    <Select name="accountId">
                        <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                        <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                </TabsContent>
                <TabsContent value="CREDIT_CARD">
                    <Select name="cardId">
                        <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                        <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </TabsContent>
             </Tabs>
          )}

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input name="description" defaultValue={transaction?.description} required className="bg-muted border-border text-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input name="amount" type="number" step="0.01" defaultValue={transaction ? Number(transaction.amount) : ''} required className="bg-muted border-border text-foreground" />
            </div>
            <div className="grid gap-2">
                <Label>Data</Label>
                <Input name="date" type="date" defaultValue={defaultDate} required className="bg-muted border-border text-foreground" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Input name="category" defaultValue={transaction?.category?.name} required className="bg-muted border-border text-foreground" />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar' : 'Criar')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
