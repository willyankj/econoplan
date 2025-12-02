'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ArrowDown, Loader2, PiggyBank, ArrowUp } from "lucide-react";
import { transferVault } from '@/app/dashboard/actions/finance';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";

interface DepositGoalModalProps {
    goal: any;
    accounts?: any[]; // Não usado diretamente mais, pois o vínculo é fixo, mas mantido pra compatibilidade
    type: "DEPOSIT" | "WITHDRAW";
}

export function DepositGoalModal({ goal, type }: DepositGoalModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

    // Se a meta não tem cofrinho vinculado, não permite operação (teoricamente não acontece mais com a regra nova)
    if (!goal.vaultId) return null;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        const formData = new FormData(event.currentTarget);
        const amount = Number(formData.get('amount'));
        
        // Usa a action centralizada de cofrinho
        const res = await transferVault(goal.vaultId, amount, mode);
        
        setIsLoading(false);
        if (res?.error) {
            toast.error(res.error);
        } else {
            toast.success(mode === 'DEPOSIT' ? "Aporte realizado!" : "Resgate realizado!");
            setOpen(false);
        }
    }

    const isDeposit = mode === 'DEPOSIT';
    const colorClass = isDeposit ? "text-emerald-600" : "text-amber-600";
    const bgClass = isDeposit ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex-1 bg-primary text-primary-foreground shadow-sm h-8 text-xs font-semibold">
                    <Plus className="w-3 h-3 mr-1" /> Aportar / Resgatar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PiggyBank className="w-5 h-5 text-muted-foreground" />
                        {goal.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4 mt-2">
                    <button 
                        onClick={() => setMode('DEPOSIT')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'DEPOSIT' ? 'bg-emerald-500 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                    >
                        <ArrowUp className="w-4 h-4" /> Aportar
                    </button>
                    <button 
                        onClick={() => setMode('WITHDRAW')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'WITHDRAW' ? 'bg-amber-500 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                    >
                        <ArrowDown className="w-4 h-4" /> Resgatar
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-center py-4 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">
                            {isDeposit 
                                ? "O dinheiro sairá da conta e entrará na meta (cofrinho)." 
                                : "O dinheiro sairá da meta e voltará para a conta."
                            }
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Valor (R$)</Label>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${colorClass}`}>R$</span>
                            <Input 
                                name="amount" 
                                type="number" 
                                step="0.01" 
                                min="0.01" 
                                required 
                                placeholder="0.00" 
                                className="pl-9 text-lg font-bold"
                                autoFocus 
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={isLoading} className={`w-full font-bold ${bgClass}`}>
                        {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirmar Transação"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}