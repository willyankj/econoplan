'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowDown, Loader2, PiggyBank, ArrowUp, CheckCircle2 } from "lucide-react";
import { transferVault } from '@/app/dashboard/actions/finance';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";
import { formatCurrency } from "@/lib/utils";

interface DepositGoalModalProps {
    goal: any;
    accounts?: any[];
    type: "DEPOSIT" | "WITHDRAW";
    defaultAccountId?: string; // NOVO: Permite forçar a conta
    label?: string; // Texto do botão
}

export function DepositGoalModal({ goal, accounts = [], type, defaultAccountId, label }: DepositGoalModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'DEPOSIT' | 'WITHDRAW'>(type || 'DEPOSIT');
    
    // Tenta achar a conta vinculada pelo ID do cofrinho OU usa o defaultAccountId
    const linkedAccount = accounts.find(acc => 
        acc.id === defaultAccountId || acc.vaults?.some((v: any) => v.id === goal.vaultId)
    );

    const [selectedAccountId, setSelectedAccountId] = useState<string>("");

    useEffect(() => {
        if (open) {
            if (defaultAccountId) {
                setSelectedAccountId(defaultAccountId);
            } else if (linkedAccount) {
                setSelectedAccountId(linkedAccount.id);
            } else if (accounts.length > 0) {
                setSelectedAccountId(accounts[0].id);
            }
        }
    }, [open, defaultAccountId, linkedAccount, accounts]);

    if (!goal.vaultId && !goal.id) return null; // Precisa de algum ID
    const vaultId = goal.vaultId || goal.id; // Suporta passar o objeto goal ou o objeto vault direto

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        
        if (!selectedAccountId) {
            toast.error("Selecione uma conta bancária.");
            return;
        }

        setIsLoading(true);
        const formData = new FormData(event.currentTarget);
        const amount = Number(formData.get('amount'));
        
        const res = await transferVault(vaultId, amount, mode, selectedAccountId);
        
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
                <Button variant={label ? "default" : "outline"} size={label ? "default" : "icon"} className={label ? "flex-1 bg-primary text-primary-foreground shadow-sm h-8 text-xs font-semibold" : "h-8 w-8"}>
                    {label ? (
                        <><Plus className="w-3 h-3 mr-1" /> {label}</>
                    ) : (
                        <ArrowUp className="w-4 h-4" />
                    )}
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
                        type="button"
                        onClick={() => setMode('DEPOSIT')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'DEPOSIT' ? 'bg-emerald-500 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                    >
                        <ArrowUp className="w-4 h-4" /> Aportar
                    </button>
                    <button 
                        type="button"
                        onClick={() => setMode('WITHDRAW')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'WITHDRAW' ? 'bg-amber-500 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                    >
                        <ArrowDown className="w-4 h-4" /> Resgatar
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-center py-4 bg-muted/30 rounded-lg border border-border/50 px-4">
                        <p className="text-xs text-muted-foreground mb-1">
                            {isDeposit 
                                ? "O dinheiro sairá da conta selecionada e irá para o cofrinho." 
                                : "O dinheiro sairá do cofrinho e voltará para a conta selecionada."
                            }
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>{isDeposit ? "Debitar de qual conta?" : "Creditrar em qual conta?"}</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        <div className="flex items-center gap-2 justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                                <span>{acc.name}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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