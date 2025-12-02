'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Loader2, Plus, Pencil, Link as LinkIcon, Calendar, PiggyBank } from "lucide-react";
import { upsertGoal } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface GoalModalProps {
  goal?: any;
  isShared?: boolean;
  workspaces?: { id: string; name: string }[];
  accounts?: any[];
}

export function GoalModal({ goal, isShared = false, workspaces = [], accounts = [] }: GoalModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para controlar se vai usar cofrinho existente ou criar novo
  const [vaultMode, setVaultMode] = useState<"existing" | "new">("new");
  const [selectedVaultId, setSelectedVaultId] = useState<string>(goal?.vaultId || "");

  const isEditing = !!goal;

  // Lista plana de todos os cofrinhos disponíveis
  const allVaults = accounts.flatMap(acc => 
    (acc.vaults || []).map((v: any) => ({ ...v, bankName: acc.bank, bankAccountName: acc.name }))
  );

  // Se já tem meta e ela tem cofrinho, abre no modo 'existing'
  useEffect(() => {
    if (goal?.vaultId) {
        setVaultMode("existing");
        setSelectedVaultId(goal.vaultId);
    } else if (allVaults.length > 0) {
        // Se tem cofrinhos mas não tá vinculado, sugere existente
        setVaultMode("existing");
    }
  }, [goal, allVaults.length]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    // Adiciona flags para o backend saber o que fazer
    if (!isShared) {
        if (vaultMode === "new") {
            formData.append("createVault", "true");
        } else {
            formData.append("createVault", "false");
            if(!selectedVaultId) {
                toast.error("Selecione um cofrinho existente.");
                setIsLoading(false);
                return;
            }
            formData.append("vaultId", selectedVaultId);
        }
    }
    
    const res = await upsertGoal(formData, goal?.id, isShared);
    
    setIsLoading(false);
    if (res?.error) {
        toast.error(res.error);
    } else {
        toast.success(isEditing ? "Meta atualizada!" : "Meta criada com sucesso!");
        setOpen(false);
    }
  }

  const formattedDeadline = goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';
  const themeBg = isShared ? "bg-purple-600 hover:bg-purple-500" : "bg-amber-500 hover:bg-amber-400";
  const themeLightBg = isShared ? "bg-purple-50 dark:bg-purple-950/20" : "bg-amber-50 dark:bg-amber-950/20";
  const themeColor = isShared ? "text-purple-500" : "text-amber-500";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></Button>
        ) : (
             <Button className={`${themeBg} text-white shadow-sm`}>
                <Plus className="w-4 h-4 mr-2" /> {isShared ? 'Meta Compartilhada' : 'Novo Objetivo'}
             </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px] p-0 gap-0 rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            {/* HERO: VALOR ALVO */}
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        {isShared ? <Target className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        {isEditing ? "Editar Meta" : "Novo Objetivo"}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input 
                        name="targetAmount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        defaultValue={goal?.targetAmount} 
                        className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        autoFocus={!isEditing}
                        required
                    />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Qual o valor total que você quer juntar?</p>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Nome do Objetivo</Label>
                    <Input name="name" defaultValue={goal?.name} placeholder="Ex: Viagem, Carro Novo, Reserva..." className="bg-muted/50 border-transparent focus:border-primary transition-all" required />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Prazo Final (Opcional)</Label>
                    <Input name="deadline" type="date" defaultValue={formattedDeadline} className="bg-muted/50 border-transparent" />
                </div>

                {/* SEÇÃO DE VÍNCULO COM COFRINHO (Apenas para metas pessoais) */}
                {!isShared && (
                    <div className="border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-4 bg-emerald-50/50 dark:bg-emerald-950/10">
                         <div className="flex items-center gap-2 mb-3">
                            <PiggyBank className="w-4 h-4 text-emerald-600" />
                            <Label className="font-semibold text-emerald-700 dark:text-emerald-400">Onde guardar o dinheiro?</Label>
                         </div>
                         
                         <Tabs value={vaultMode} onValueChange={(v) => setVaultMode(v as any)} className="w-full">
                            <TabsList className="w-full grid grid-cols-2 mb-3 h-8">
                                <TabsTrigger value="new" className="text-xs">Criar Novo Cofrinho</TabsTrigger>
                                <TabsTrigger value="existing" className="text-xs" disabled={allVaults.length === 0}>Usar Existente</TabsTrigger>
                            </TabsList>

                            <TabsContent value="new" className="space-y-3 animate-in fade-in-50">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Nome do Cofrinho</Label>
                                    <Input name="newVaultName" placeholder="Ex: Cofre da Viagem" defaultValue={goal?.name ? `Cofre ${goal.name}` : ''} className="h-9 bg-background" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Vincular a qual conta bancária?</Label>
                                    <Select name="newVaultAccountId">
                                        <SelectTrigger className="h-9 bg-background">
                                            <SelectValue placeholder="Selecione o banco..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    <div className="flex items-center gap-2">
                                                        <BankLogo bankName={acc.bank} className="w-3 h-3" />
                                                        {acc.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Criaremos um "envelope" separado dentro desta conta para você organizar esse dinheiro.
                                </p>
                            </TabsContent>

                            <TabsContent value="existing" className="space-y-3 animate-in fade-in-50">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Selecione o cofrinho</Label>
                                    <Select value={selectedVaultId} onValueChange={setSelectedVaultId}>
                                        <SelectTrigger className="h-9 bg-background">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allVaults.map(v => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    <div className="flex items-center gap-2">
                                                        <BankLogo bankName={v.bankName} className="w-3 h-3" />
                                                        <span>{v.name} (R$ {Number(v.balance).toFixed(2)})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedVaultId && (
                                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3" />
                                        A meta herdará o saldo atual de R$ {allVaults.find(v => v.id === selectedVaultId)?.balance?.toFixed(2)} deste cofrinho.
                                    </p>
                                )}
                            </TabsContent>
                         </Tabs>
                    </div>
                )}

                <Button type="submit" disabled={isLoading} className={`w-full text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02] ${themeBg} hover:opacity-90`}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Meta')}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}