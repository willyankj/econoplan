'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiggyBank, Plus, ArrowRightLeft, Trash2, Loader2, TrendingUp, TrendingDown, Info } from "lucide-react";
import { upsertVault, deleteVault, transferVault } from '@/app/dashboard/actions/finance';
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface VaultManagerProps {
  accountId: string;
  vaults: any[];
}

export function VaultManager({ accountId, vaults }: VaultManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('bankAccountId', accountId);
    
    const res = await upsertVault(formData);
    setLoading(false);
    if (res?.error) toast.error(res.error);
    else {
        toast.success("Cofrinho criado!");
        setIsCreateOpen(false);
    }
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <PiggyBank className="w-4 h-4" /> Cofrinhos & Reservas
        </h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Novo Cofrinho
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Criar Novo Cofrinho</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                    <div className="grid gap-2">
                        <Label>Nome (ex: Reserva de Emergência)</Label>
                        <Input name="name" required placeholder="Para que serve este dinheiro?" />
                    </div>
                    
                    {/* CAMPO DE SALDO INICIAL */}
                    <div className="grid gap-2 bg-muted/50 p-3 rounded-md border border-border/50">
                        <Label className="flex items-center gap-2">
                             Saldo Já Guardado (Opcional)
                        </Label>
                        <Input 
                            name="initialBalance" 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="bg-background"
                        />
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                            Use isto se você já tem esse dinheiro guardado separadamente. Este valor não será descontado do saldo da sua conta principal no app.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Meta Alvo (Opcional)</Label>
                        <Input name="targetAmount" type="number" step="0.01" placeholder="Quanto quer juntar no total?" />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Criar Cofrinho"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {vaults.length === 0 && (
            <div className="col-span-full text-center p-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                Nenhum cofrinho criado nesta conta.
            </div>
        )}
        {vaults.map(vault => (
            <VaultCard key={vault.id} vault={vault} />
        ))}
      </div>
    </div>
  );
}

function VaultCard({ vault }: { vault: any }) {
    const [openTransfer, setOpenTransfer] = useState(false);
    const [mode, setMode] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [loading, setLoading] = useState(false);

    async function handleTransfer(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const amount = Number(formData.get('amount'));
        
        const res = await transferVault(vault.id, amount, mode);
        setLoading(false);
        
        if (res?.error) toast.error(res.error);
        else {
            toast.success(mode === 'DEPOSIT' ? "Dinheiro guardado!" : "Dinheiro resgatado!");
            setOpenTransfer(false);
        }
    }

    async function handleDelete() {
        if(!confirm("Tem certeza? O cofrinho deve estar vazio.")) return;
        const res = await deleteVault(vault.id);
        if(res?.error) toast.error(res.error);
        else toast.success("Cofrinho removido.");
    }

    const percentage = vault.targetAmount ? Math.min(100, (Number(vault.balance) / Number(vault.targetAmount)) * 100) : 0;

    return (
        <Card className="overflow-hidden border-l-4 border-l-emerald-500 shadow-sm hover:shadow transition-all">
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="overflow-hidden">
                        <h4 className="font-bold text-sm truncate" title={vault.name}>{vault.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Saldo Guardado</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><ArrowRightLeft className="w-3 h-3" /></Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader><DialogTitle>Movimentar Cofrinho</DialogTitle></DialogHeader>
                                <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4">
                                    <button 
                                        onClick={() => setMode('DEPOSIT')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'DEPOSIT' ? 'bg-emerald-500 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                                    >
                                        <TrendingUp className="w-4 h-4" /> Guardar
                                    </button>
                                    <button 
                                        onClick={() => setMode('WITHDRAW')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'WITHDRAW' ? 'bg-amber-500 text-white shadow' : 'text-muted-foreground hover:bg-background'}`}
                                    >
                                        <TrendingDown className="w-4 h-4" /> Resgatar
                                    </button>
                                </div>
                                <form onSubmit={handleTransfer} className="space-y-4">
                                    <div className="text-center py-4 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {mode === 'DEPOSIT' ? 'Sai da Conta Principal -> Entra no Cofrinho' : 'Sai do Cofrinho -> Volta para Conta Principal'}
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Valor (R$)</Label>
                                        <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" autoFocus />
                                    </div>
                                    <Button className={`w-full ${mode === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`} disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirmar"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={handleDelete}>
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
                
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {Number(vault.balance).toFixed(2)}
                </div>

                {Number(vault.targetAmount) > 0 && (
                    <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{percentage.toFixed(0)}% da meta</span>
                            <span>Alvo: R$ {Number(vault.targetAmount).toFixed(2)}</span>
                        </div>
                        <Progress value={percentage} className="h-1.5 bg-emerald-100 dark:bg-emerald-950" indicatorClassName="bg-emerald-500" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}