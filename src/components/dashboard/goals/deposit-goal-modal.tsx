'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank, Loader2 } from "lucide-react";
import { addMoneyToGoal, withdrawMoneyFromGoal } from '@/app/dashboard/actions';
import { BankLogo } from "@/components/ui/bank-logo";

interface DepositModalProps {
  goal: { 
    id: string; 
    name: string; 
    targetAmount: number; 
    currentAmount: number;
  };
  // Accounts pode ter propriedade extra 'workspaceName' na visão geral
  accounts: (any & { workspaceName?: string })[]; 
  type: 'DEPOSIT' | 'WITHDRAW';
}

export function DepositGoalModal({ goal, accounts, type }: DepositModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');

  async function handleConfirm() {
    if (!amount || !accountId) return;
    setIsLoading(true);
    
    const value = parseFloat(amount);

    if (type === 'DEPOSIT') {
        await addMoneyToGoal(goal.id, value, accountId);
    } else {
        await withdrawMoneyFromGoal(goal.id, value, accountId);
    }
    
    setIsLoading(false);
    setOpen(false);
    setAmount('');
    setAccountId('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="outline" 
            size="sm" 
            className={`w-full ${type === 'DEPOSIT' ? "text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10" : "text-muted-foreground hover:text-foreground"}`}
        >
            {type === 'DEPOSIT' ? 'Guardar' : 'Resgatar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-500" />
            {type === 'DEPOSIT' ? `Guardar em "${goal.name}"` : `Resgatar de "${goal.name}"`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{type === 'DEPOSIT' ? 'Tirar dinheiro de:' : 'Enviar dinheiro para:'}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                {accounts.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhuma conta disponível</SelectItem>
                ) : (
                    accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2 w-full">
                            <div className="w-4 h-4 overflow-hidden flex items-center justify-center flex-shrink-0">
                                <BankLogo bankName={acc.bank} className="w-4 h-4" />
                            </div>
                            
                            <span className="truncate">
                                {acc.name}
                                {/* Exibe o nome do workspace se for uma meta compartilhada */}
                                {acc.workspaceName && (
                                    <span className="text-xs text-muted-foreground ml-1">({acc.workspaceName})</span>
                                )}
                            </span>
                            
                            <span className="text-xs text-muted-foreground ml-auto pl-2 whitespace-nowrap">
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
            <Label>Valor (R$)</Label>
            <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                className="bg-muted border-border text-foreground text-lg font-bold placeholder:text-muted-foreground"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button onClick={handleConfirm} disabled={isLoading || !amount || !accountId} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
