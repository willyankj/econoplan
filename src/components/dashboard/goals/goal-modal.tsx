'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Loader2, Plus, Pencil, Users, PieChart, RefreshCw, Link as LinkIcon, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { upsertGoal } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";

interface GoalModalProps {
  goal?: any;
  isShared?: boolean;
  workspaces?: { id: string; name: string }[];
  accounts?: any[];
}

export function GoalModal({ goal, isShared = false, workspaces = [], accounts = [] }: GoalModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [rules, setRules] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isEditing = !!goal;

  useEffect(() => {
      if (goal?.contributionRules) {
          const savedRules = goal.contributionRules as Record<string, number>;
          setRules(savedRules);
          setSelectedIds(Object.keys(savedRules));
      } else if (isShared && workspaces.length > 0 && !isEditing && open) {
          const allIds = workspaces.map(w => w.id);
          setSelectedIds(allIds);
          distributeEvenly(allIds);
      }
  }, [goal, isShared, workspaces, open, isEditing]);

  const distributeEvenly = (ids: string[]) => {
      if (ids.length === 0) { setRules({}); return; }
      const equalShare = Math.floor(100 / ids.length);
      const remainder = 100 - (equalShare * ids.length);
      const newRules: Record<string, number> = {};
      ids.forEach((id, index) => { newRules[id] = index === 0 ? equalShare + remainder : equalShare; });
      setRules(newRules);
  };

  const handleToggleParticipant = (wsId: string, checked: boolean) => {
      let newSelected = [...selectedIds];
      if (checked) newSelected.push(wsId); else newSelected = newSelected.filter(id => id !== wsId);
      setSelectedIds(newSelected); distributeEvenly(newSelected); 
  };

  const handleRuleChange = (wsId: string, val: string) => {
      const num = Math.min(100, Math.max(0, Number(val)));
      setRules(prev => ({ ...prev, [wsId]: num }));
  };

  const totalPercentage = Object.entries(rules).filter(([key]) => selectedIds.includes(key)).reduce((acc, [, val]) => acc + val, 0);
  const isTotalValid = totalPercentage === 100;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isShared && totalPercentage !== 100) return toast.error(`A soma das porcentagens deve ser 100%. Atualmente: ${totalPercentage}%`);
    if (isShared && selectedIds.length === 0) return toast.error("Selecione pelo menos um participante.");

    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    if (isShared) {
        const finalRules: Record<string, number> = {};
        selectedIds.forEach(id => { finalRules[id] = rules[id] || 0; });
        formData.append('contributionRules', JSON.stringify(finalRules));
    }
    
    try {
        if (isEditing) await upsertGoal(formData, goal.id);
        else if (isShared) await upsertGoal(formData, undefined, true);
        else await upsertGoal(formData);
        toast.success(isEditing ? "Meta atualizada!" : "Meta criada!");
        setOpen(false);
    } catch (error) { toast.error("Erro ao salvar meta."); } 
    finally { setIsLoading(false); }
  }

  const formattedDeadline = goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';
  const themeColor = isShared ? "text-purple-500" : "text-amber-500";
  const themeBg = isShared ? "bg-purple-600 hover:bg-purple-500" : "bg-amber-500 hover:bg-amber-400";
  const themeLightBg = isShared ? "bg-purple-50 dark:bg-purple-950/20" : "bg-amber-50 dark:bg-amber-950/20";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></Button>
        ) : (
             <Button className={`${themeBg} text-white shadow-sm`}>
                <Plus className="w-4 h-4 mr-2" /> {isShared ? 'Nova Meta Conjunta' : 'Novo Objetivo'}
             </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-thin p-0 gap-0 rounded-xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            {/* HERO INPUT (VALOR DA META) */}
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        {isShared ? <Users className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        {isEditing ? "Editar Meta" : (isShared ? "Nova Meta Compartilhada" : "Novo Objetivo")}
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
                <p className="text-center text-xs text-muted-foreground mt-2">Quanto você quer juntar?</p>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Nome do Objetivo</Label>
                    <Input name="name" defaultValue={goal?.name} placeholder="Ex: Viagem para Europa, Carro Novo..." className="bg-muted/50 border-transparent focus:border-primary transition-all" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {!isEditing && !isShared && (
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground ml-1">Saldo Inicial (Já tenho)</Label>
                            <Input name="currentAmount" type="number" step="0.01" placeholder="0.00" className="bg-muted/50 border-transparent" />
                        </div>
                    )}
                    <div className={`grid gap-1.5 ${isEditing || isShared ? 'col-span-2' : ''}`}>
                        <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Prazo Final</Label>
                        <Input name="deadline" type="date" defaultValue={formattedDeadline} className="bg-muted/50 border-transparent" />
                    </div>
                </div>

                {/* VINCULAR CONTA */}
                {!isShared && (
                    <div className="grid gap-1.5 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <Label className="text-xs text-blue-500 font-medium flex items-center gap-1 mb-1">
                            <LinkIcon className="w-3 h-3" /> Automação (Vincular Conta)
                        </Label>
                        <Select name="linkedAccountId" defaultValue={goal?.linkedAccountId || "none"}>
                            <SelectTrigger className="bg-background border-border h-9">
                                <SelectValue placeholder="Selecione uma conta..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Não vincular (Manual)</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        <div className="flex items-center gap-2">
                                            <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                            {acc.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground mt-1">Toda movimentação nesta conta atualizará a meta automaticamente.</p>
                    </div>
                )}

                {/* PARTICIPANTES (COMPARTILHADA) */}
                {isShared && workspaces.length > 0 && (
                    <div className="border-t border-border pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-purple-500 font-bold text-xs flex items-center gap-1"><PieChart className="w-3 h-3" /> Divisão</Label>
                            <div className="flex items-center gap-2">
                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isTotalValid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {isTotalValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    Total: {totalPercentage}%
                                </div>
                                <button type="button" onClick={() => distributeEvenly(selectedIds)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/50 px-2 py-1 rounded"><RefreshCw className="w-3 h-3" /> Distribuir Igual</button>
                            </div>
                        </div>
                        <div className="space-y-2 bg-muted/30 p-2 rounded-lg border border-border max-h-[150px] overflow-y-auto">
                            {workspaces.map(ws => {
                                const isSelected = selectedIds.includes(ws.id);
                                return (
                                    <div key={ws.id} className={`flex items-center gap-2 p-2 rounded border transition-all ${isSelected ? 'bg-card border-border' : 'border-transparent opacity-50'}`}>
                                        <Checkbox checked={isSelected} onCheckedChange={(c) => handleToggleParticipant(ws.id, c as boolean)} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                                        <span className="text-xs font-medium flex-1 truncate">{ws.name}</span>
                                        {isSelected && (
                                            <div className="flex items-center gap-1 w-[120px]">
                                                <input type="range" min="0" max="100" step="1" value={rules[ws.id] || 0} onChange={(e) => handleRuleChange(ws.id, e.target.value)} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                                <span className="text-xs font-mono w-8 text-right">{rules[ws.id] || 0}%</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
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