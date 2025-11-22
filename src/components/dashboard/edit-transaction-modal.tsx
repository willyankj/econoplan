'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";
import { updateTransaction } from '@/app/dashboard/actions';

interface TransactionData {
  id: string;
  description: string;
  amount: number;
  type: string; 
  date: Date;
  category: { name: string } | null;
}

export function EditTransactionModal({ transaction }: { transaction: TransactionData }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Estado local para controlar tipo apenas visualmente (o backend não muda tipo conta->cartão por enquanto)
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(transaction.type as any);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await updateTransaction(transaction.id, formData);
    setIsLoading(false);
    setOpen(false);
  }

  const formattedDate = new Date(transaction.date).toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 h-8 w-8 mr-1">
            <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      {/* CORES CORRIGIDAS */}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Transação</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input 
                name="description" 
                defaultValue={transaction.description}
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={Number(transaction.amount)}
                    className="bg-muted border-border text-foreground" 
                    required 
                />
            </div>
            <div className="grid gap-2">
                <Label>Data</Label>
                <Input 
                    name="date" 
                    type="date" 
                    defaultValue={formattedDate}
                    className="bg-muted border-border text-foreground" 
                    required 
                />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Input 
                name="category" 
                defaultValue={transaction.category?.name || ''}
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}