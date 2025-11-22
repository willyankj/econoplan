'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank, Loader2, ArrowRight } from "lucide-react";
import { addMoneyToGoal, withdrawMoneyFromGoal } from '@/app/dashboard/actions';
import { BankLogo } from "@/components/ui/bank-logo";

interface DepositModalProps {
  goal: { id: string; name: string; };
  accounts: any[];
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
    
    if (type === 'DEPOSIT') {
        await addMoneyToGoal(goal.id, parseFloat(amount), accountId);
    } else {
        await withdrawMoneyFromGoal(goal.id, parseFloat(amount), accountId);
    }
    
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={type === 'DEPOSIT' ? "text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10" : "text-slate-400 hover:text-white"}>
            {type === 'DEPOSIT' ? 'Guardar' : 'Resgatar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1d24] border-slate-700 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-500" />
            {type === 'DEPOSIT' ? `Guardar em "${goal.name}"` : `Resgatar de "${goal.name}"`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{type === 'DEPOSIT' ? 'Tirar dinheiro de:' : 'Enviar dinheiro para:'}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d24] border-slate-700 text-slate-200">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                       <BankLogo bankName={acc.bank} className="w-4 h-4" />
                       {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Valor (R$)</Label>
            <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                className="bg-slate-900 border-slate-700 text-white text-lg font-bold"
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
