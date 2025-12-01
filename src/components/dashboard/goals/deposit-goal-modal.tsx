'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank, Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { addMoneyToGoal, withdrawMoneyFromGoal } from '@/app/dashboard/actions';
import { BankLogo } from "@/components/ui/bank-logo";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface DepositModalProps {
  goal: { 
    id: string; 
    name: string; 
    targetAmount: number; 
    currentAmount: number;
  };
  accounts: (any & { workspaceName?: string })[]; 
  type: 'DEPOSIT' | 'WITHDRAW';
  disabled?: boolean;
}

export function DepositGoalModal({ goal, accounts, type, disabled = false }: DepositModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');

  const isDeposit = type === 'DEPOSIT';
  
  // Temas Dinâmicos
  const themeColor = isDeposit ? "text-emerald-500" : "text-amber-500";
  const themeBg = isDeposit ? "bg-emerald-600" : "bg-amber-500";
  const themeLightBg = isDeposit ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-amber-50 dark:bg-amber-950/20";

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !accountId) return;
    setIsLoading(true);
    
    const value = parseFloat(amount);
    let result;

    if (isDeposit) {
        result = await addMoneyToGoal(goal.id, value, accountId);
    } else {
        result = await withdrawMoneyFromGoal(goal.id, value, accountId);
    }
    
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro na operação", { description: result.error });
    } else {
        toast.success(isDeposit ? "Valor guardado com sucesso!" : "Resgate realizado com sucesso!");
        setOpen(false);
        setAmount('');
        setAccountId('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="outline" 
            size="sm" 
            className={`w-full ${isDeposit ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400" : "text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-400"}`}
            disabled={disabled}
        >
            {isDeposit ? <ArrowUpCircle className="w-4 h-4 mr-2" /> : <ArrowDownCircle className="w-4 h-4 mr-2" />}
            {isDeposit ? 'Guardar' : 'Resgatar'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] p-0 gap-0 rounded-xl overflow-hidden">
        <form onSubmit={handleConfirm} className="flex flex-col">
            
            {/* HEADER COM VALOR */}
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        {isDeposit ? "Guardar Dinheiro" : "Resgatar Valor"} - {goal.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        autoFocus
                        required
                        min={!isDeposit ? 0.01 : 0}
                        max={!isDeposit ? goal.currentAmount : undefined}
                    />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                    {isDeposit ? "Quanto você quer investir hoje?" : `Disponível para resgate: ${formatCurrency(goal.currentAmount)}`}
                </p>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">
                        {isDeposit ? 'Debitar de qual conta?' : 'Enviar para qual conta?'}
                    </Label>
                    <Select value={accountId} onValueChange={setAccountId} required>
                        <SelectTrigger className="bg-muted/50 border-transparent h-11 w-full">
                            <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.length === 0 ? (
                                <SelectItem value="none" disabled>Nenhuma conta disponível</SelectItem>
                            ) : (
                                accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                    <div className="flex items-center gap-2">
                                        <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                        {acc.name}
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {formatCurrency(acc.balance)}
                                        </span>
                                    </div>
                                </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <Button type="submit" disabled={isLoading || !amount || !accountId} className={`w-full text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02] ${themeBg} hover:opacity-90`}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Confirmar'}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}