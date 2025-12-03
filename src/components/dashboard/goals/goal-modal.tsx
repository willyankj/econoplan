'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Loader2, Plus, Pencil, Calendar, PiggyBank, Users, Wallet, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { upsertGoal } from '@/app/dashboard/actions/finance';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

interface GoalModalProps {
  goal?: any;
  isShared?: boolean;
  workspaces?: { id: string; name: string }[];
  accounts?: any[];
  myWorkspaceId?: string;
  isOwner?: boolean;
}

export function GoalModal({ goal, isShared = false, workspaces = [], accounts = [], myWorkspaceId, isOwner = false }: GoalModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [participants, setParticipants] = useState<Record<string, number>>({});
  
  // Controle de modo de cofrinho
  const [vaultMode, setVaultMode] = useState<"new" | "existing">("new");
  
  const isEditing = !!goal;
  
  const myExistingVault = goal?.vaults?.find((v: any) => v.bankAccount.workspaceId === myWorkspaceId);
  const hasVault = !!myExistingVault;

  // Lista de cofrinhos disponíveis (que ainda não estão em meta, ou apenas listagem geral)
  const availableVaults = accounts.flatMap(acc => acc.vaults || []).filter(v => !v.goalId);

  useEffect(() => {
      if (open && myWorkspaceId) { 
          const existingRules = goal?.contributionRules as Record<string, number> | null;
          
          if (existingRules && Object.keys(existingRules).length > 0) {
              setParticipants(existingRules);
          } 
          else {
              setParticipants({ [myWorkspaceId]: 100 });
          }
          
          // Se não tem cofrinho mas tem disponíveis, sugere usar existente? Não, padrão é criar novo.
      }
  }, [open, goal, isShared, myWorkspaceId]);

  const updateParticipant = (wsId: string, checked: boolean) => {
      const newMap = { ...participants };
      if (checked) {
          newMap[wsId] = 0; 
      } else {
          delete newMap[wsId];
      }
      setParticipants(newMap);
  };

  const updatePercentage = (wsId: string, value: number) => {
      setParticipants(prev => ({ ...prev, [wsId]: value }));
  };

  const totalPercentage = Object.values(participants).reduce((a, b) => a + b, 0);
  const formattedDeadline = goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';
  
  const isParticipating = myWorkspaceId && participants[myWorkspaceId] !== undefined;
  // Mostra seção de vault se: não tenho vault vinculado E estou participando
  const showVaultSection = !hasVault && isParticipating;
  
  const isLinkingOnly = isEditing && isShared && showVaultSection;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (isShared && isOwner && !isLinkingOnly) {
        if (Object.keys(participants).length === 0) {
            toast.error("Selecione pelo menos um participante.");
            return;
        }
        if (Math.abs(totalPercentage - 100) > 0.1) {
            toast.error(`A soma das porcentagens deve ser 100%. Atual: ${totalPercentage}%`);
            return;
        }
    }

    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    if (isShared) {
        formData.set("participantsMap", JSON.stringify(participants));
    }

    // Configura flags para o backend
    if (showVaultSection) {
        if (vaultMode === "new") {
            formData.set("createMyVault", "true");
            formData.set("useExistingVault", "false");
        } else {
            formData.set("createMyVault", "false");
            formData.set("useExistingVault", "true");
            // Validar se selecionou algum
            const existingId = formData.get("myExistingVaultId");
            if (!existingId) {
                toast.error("Selecione um cofrinho existente.");
                setIsLoading(false);
                return;
            }
        }
    } else {
        formData.set("createMyVault", "false");
        formData.set("useExistingVault", "false");
    }
    
    const res = await upsertGoal(formData, goal?.id, isShared);
    setIsLoading(false);
    
    if (res?.error) {
        toast.error(res.error);
    } else {
        toast.success(isEditing ? (isLinkingOnly ? "Cofrinho vinculado!" : "Meta atualizada!") : "Meta criada!");
        setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
             isLinkingOnly ? (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-semibold h-8 text-xs w-full">
                    <LinkIcon className="w-3 h-3 mr-2" /> Vincular Cofrinho
                </Button>
             ) : (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></Button>
             )
        ) : (
             <Button className={`${isShared ? "bg-purple-600 hover:bg-purple-500" : "bg-amber-500 hover:bg-amber-400"} text-white shadow-sm`}>
                <Plus className="w-4 h-4 mr-2" /> {isShared ? 'Nova Meta Conjunta' : 'Novo Objetivo'}
             </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border sm:max-w-[500px] p-0 rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            {isLinkingOnly && (
                <>
                    <input type="hidden" name="name" value={goal?.name} />
                    <input type="hidden" name="deadline" value={formattedDeadline} />
                    <input type="hidden" name="targetAmount" value={goal?.targetAmount} />
                </>
            )}

            <div className={`p-6 pb-8 ${isShared ? "bg-purple-50 dark:bg-purple-950/20" : "bg-amber-50 dark:bg-amber-950/20"}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase flex items-center justify-center gap-2">
                        {isShared ? <Users className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        {isLinkingOnly ? "Vincular Cofrinho" : (isEditing ? "Editar Meta" : (isShared ? "Nova Meta Conjunta" : "Novo Objetivo"))}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50`}>R$</span>
                    <Input name="targetAmount" type="number" step="0.01" placeholder="0,00" defaultValue={goal?.targetAmount} className="text-5xl font-bold text-center border-none bg-transparent h-16 w-full shadow-none focus-visible:ring-0" required readOnly={isLinkingOnly} />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Valor TOTAL da meta</p>
            </div>

            <div className="p-6 space-y-5">
                {!isLinkingOnly && (
                    <>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1">Nome</Label>
                        <Input name="name" defaultValue={goal?.name} placeholder="Ex: Viagem, Carro..." required />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Prazo (Opcional)</Label>
                        <Input name="deadline" type="date" defaultValue={formattedDeadline} />
                    </div>
                    </>
                )}

                {/* LISTA DE PARTICIPANTES */}
                {isShared && isOwner && !isLinkingOnly && (
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                        <div className="flex justify-between items-center mb-3">
                            <Label className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" /> Quem participa?</Label>
                            <span className={`text-xs font-bold ${totalPercentage === 100 ? 'text-emerald-500' : 'text-rose-500'}`}>Total: {totalPercentage}%</span>
                        </div>
                        
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                            {workspaces.map(ws => {
                                const isSelected = participants[ws.id] !== undefined;
                                const isMe = ws.id === myWorkspaceId;
                                return (
                                    <div key={ws.id} className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition-all ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Checkbox 
                                                id={`ws-${ws.id}`} 
                                                checked={isSelected} 
                                                onCheckedChange={(c) => updateParticipant(ws.id, !!c)}
                                            />
                                            <Label htmlFor={`ws-${ws.id}`} className="truncate text-sm cursor-pointer font-medium">
                                                {ws.name} {isMe && <span className="text-xs text-muted-foreground font-normal">(Eu)</span>}
                                            </Label>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center gap-1 w-24 shrink-0 animate-in slide-in-from-right-2">
                                                <Input 
                                                    type="number" 
                                                    min="0" 
                                                    max="100" 
                                                    value={participants[ws.id]} 
                                                    onChange={(e) => updatePercentage(ws.id, Number(e.target.value))}
                                                    className="h-8 text-right pr-1 font-bold"
                                                />
                                                <span className="text-xs text-muted-foreground">%</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* CRIAÇÃO/VINCULAÇÃO DO COFRINHO */}
                {showVaultSection && (
                    <div className={`border ${isShared ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10'} rounded-xl p-4 animate-in fade-in-50`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className={`w-4 h-4 ${isShared ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <Label className={`font-semibold ${isShared ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                                {isLinkingOnly ? "Vincular meu cofrinho" : "Onde guardar o dinheiro?"}
                            </Label>
                        </div>

                        <Tabs value={vaultMode} onValueChange={(v) => setVaultMode(v as any)} className="w-full">
                            <TabsList className="w-full grid grid-cols-2 mb-3 h-8">
                                <TabsTrigger value="new" className="text-xs">Criar Novo</TabsTrigger>
                                <TabsTrigger value="existing" className="text-xs" disabled={availableVaults.length === 0}>Usar Existente</TabsTrigger>
                            </TabsList>

                            <TabsContent value="new" className="space-y-3 mt-0">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Nome do seu Cofrinho</Label>
                                    <Input name="myVaultName" defaultValue={goal ? `Cofre ${goal.name}` : ''} placeholder="Ex: Meu Pote da Viagem" className="h-9" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Conta Bancária</Label>
                                    <Select name="myVaultAccountId">
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    <div className="flex items-center gap-2"><BankLogo bankName={acc.bank} className="w-3 h-3" />{acc.name}</div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Saldo Inicial (Já guardado)</Label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-bold">R$</span>
                                        <Input name="initialBalance" type="number" step="0.01" placeholder="0.00" className="h-9 pl-7" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Valor que você já tem guardado fora da plataforma.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="existing" className="space-y-3 mt-0">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">Selecione o cofrinho</Label>
                                    <Select name="myExistingVaultId">
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableVaults.map(v => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    <div className="flex items-center gap-2">
                                                        <PiggyBank className="w-3 h-3 text-muted-foreground" />
                                                        <span>{v.name} (R$ {Number(v.balance).toFixed(2)})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">Este cofrinho será vinculado a esta meta e seu saldo será somado ao total.</p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {isShared && (
                            <p className="text-[10px] text-muted-foreground bg-background/50 p-2 rounded border border-emerald-200/50 mt-3">
                                Você será responsável por <strong>{participants[myWorkspaceId]}%</strong> desta meta.
                            </p>
                        )}
                    </div>
                )}
                
                {hasVault && !isLinkingOnly && (
                    <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg flex items-center gap-2 border border-emerald-100 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        Seu cofrinho <strong>{myExistingVault.name}</strong> já está ativo.
                    </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full font-bold h-12 mt-2">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isLinkingOnly ? "Vincular e Começar" : "Salvar")}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}