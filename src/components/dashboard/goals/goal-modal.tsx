'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // <--- Importante
import { Target, Loader2, Plus, Pencil, Users, PieChart, RefreshCw } from "lucide-react";
import { upsertGoal } from '@/app/dashboard/actions';
import { toast } from "sonner";

interface GoalModalProps {
  goal?: any;
  isShared?: boolean;
  workspaces?: { id: string; name: string }[];
}

export function GoalModal({ goal, isShared = false, workspaces = [] }: GoalModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Regras: { "workspaceId": porcentagem }
  const [rules, setRules] = useState<Record<string, number>>({});
  
  // Lista de IDs dos participantes selecionados
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isEditing = !!goal;

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
      if (goal?.contributionRules) {
          // EDIÇÃO: Carrega do banco
          const savedRules = goal.contributionRules as Record<string, number>;
          setRules(savedRules);
          setSelectedIds(Object.keys(savedRules)); // Quem tem regra, está participando
      } else if (isShared && workspaces.length > 0 && !isEditing && open) {
          // CRIAÇÃO: Seleciona todos por padrão ao abrir
          const allIds = workspaces.map(w => w.id);
          setSelectedIds(allIds);
          distributeEvenly(allIds);
      }
  }, [goal, isShared, workspaces, open, isEditing]);

  // --- LÓGICA DE DISTRIBUIÇÃO ---
  const distributeEvenly = (ids: string[]) => {
      if (ids.length === 0) {
          setRules({});
          return;
      }
      const equalShare = Math.floor(100 / ids.length);
      const remainder = 100 - (equalShare * ids.length); // O que sobra pra fechar 100
      
      const newRules: Record<string, number> = {};
      ids.forEach((id, index) => {
          // Dá o resto para o primeiro para fechar 100%
          newRules[id] = index === 0 ? equalShare + remainder : equalShare;
      });
      setRules(newRules);
  };

  const handleToggleParticipant = (wsId: string, checked: boolean) => {
      let newSelected = [...selectedIds];
      if (checked) {
          newSelected.push(wsId);
      } else {
          newSelected = newSelected.filter(id => id !== wsId);
      }
      
      setSelectedIds(newSelected);
      distributeEvenly(newSelected); // Recalcula divisão ao adicionar/remover
  };

  const handleRuleChange = (wsId: string, val: string) => {
      const num = Math.min(100, Math.max(0, Number(val)));
      setRules(prev => ({ ...prev, [wsId]: num }));
  };

  // Total apenas dos selecionados
  const totalPercentage = Object.entries(rules)
    .filter(([key]) => selectedIds.includes(key))
    .reduce((acc, [, val]) => acc + val, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    // Validação
    if (isShared && totalPercentage !== 100) {
        return toast.error(`A soma das porcentagens deve ser 100% (Atual: ${totalPercentage}%)`);
    }
    if (isShared && selectedIds.length === 0) {
        return toast.error("Selecione pelo menos um participante.");
    }

    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    if (isShared) {
        // Filtra o objeto rules para enviar APENAS os selecionados
        const finalRules: Record<string, number> = {};
        selectedIds.forEach(id => {
            finalRules[id] = rules[id] || 0;
        });
        formData.append('contributionRules', JSON.stringify(finalRules));
    }
    
    try {
        if (isEditing) await upsertGoal(formData, goal.id);
        else if (isShared) await upsertGoal(formData, undefined, true);
        else await upsertGoal(formData);
        
        toast.success(isEditing ? "Meta atualizada!" : "Meta criada!");
        setOpen(false);
    } catch (error) {
        toast.error("Erro ao salvar meta.");
    } finally {
        setIsLoading(false);
    }
  }

  const formattedDeadline = goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Pencil className="w-3 h-3" />
             </Button>
        ) : (
             <Button className={`${isShared ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white shadow-sm`}>
                <Plus className="w-4 h-4 mr-2" /> {isShared ? 'Nova Meta Conjunta' : 'Novo Objetivo'}
             </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            {isShared ? <Users className="w-5 h-5 text-purple-500" /> : <Target className="w-5 h-5 text-emerald-500" />}
            {isEditing ? "Editar Meta" : (isShared ? "Criar Meta da Organização" : "Criar Nova Meta")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          {isShared && !isEditing && (
            <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded text-xs text-purple-400 mb-2">
                Você pode escolher quais workspaces participam desta meta e definir quanto cada um deve contribuir.
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Objetivo</Label>
            <Input id="name" name="name" defaultValue={goal?.name} placeholder="Ex: Viagem, Reserva..." className="bg-muted border-border text-foreground" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="targetAmount">Valor da Meta (R$)</Label>
                <Input id="targetAmount" name="targetAmount" type="number" step="0.01" defaultValue={goal?.targetAmount} placeholder="10000.00" className="bg-muted border-border text-foreground" required />
            </div>
            {!isEditing && !isShared && (
                <div className="grid gap-2">
                    <Label htmlFor="currentAmount">Já tenho (R$)</Label>
                    <Input id="currentAmount" name="currentAmount" type="number" step="0.01" placeholder="0.00" className="bg-muted border-border text-foreground" />
                </div>
            )}
             <div className="grid gap-2">
                <Label htmlFor="deadline">Prazo (Opcional)</Label>
                <Input id="deadline" name="deadline" type="date" defaultValue={formattedDeadline} className="bg-muted border-border text-foreground" />
            </div>
          </div>

          {/* SEÇÃO DE PARTICIPANTES E REGRAS */}
          {isShared && workspaces.length > 0 && (
              <div className="border-t border-border pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                      <Label className="text-purple-400 flex items-center gap-2">
                          <PieChart className="w-4 h-4" /> Participantes e Divisão
                      </Label>
                      <div className="flex items-center gap-3">
                          <button type="button" onClick={() => distributeEvenly(selectedIds)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                             <RefreshCw className="w-3 h-3" /> Distribuir Igual
                          </button>
                          <span className={`text-xs font-bold ${totalPercentage !== 100 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              Total: {totalPercentage}%
                          </span>
                      </div>
                  </div>
                  
                  <div className="space-y-2 bg-muted/30 p-2 rounded-lg border border-border max-h-[200px] overflow-y-auto">
                      {workspaces.map(ws => {
                          const isSelected = selectedIds.includes(ws.id);
                          return (
                            <div key={ws.id} className={`flex items-center gap-3 p-2 rounded border transition-all ${isSelected ? 'bg-card border-border' : 'border-transparent opacity-50'}`}>
                                {/* Checkbox de Seleção */}
                                <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleToggleParticipant(ws.id, checked as boolean)}
                                    className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                />
                                
                                <span className="text-xs font-medium flex-1 truncate">{ws.name}</span>
                                
                                {/* Slider e Valor (Só aparece se selecionado) */}
                                {isSelected && (
                                    <div className="flex items-center gap-2 w-[140px]">
                                        <input 
                                            type="range" 
                                            min="0" max="100" step="1"
                                            value={rules[ws.id] || 0}
                                            onChange={(e) => handleRuleChange(ws.id, e.target.value)}
                                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <span className="text-xs font-mono w-8 text-right">{rules[ws.id] || 0}%</span>
                                    </div>
                                )}
                            </div>
                          );
                      })}
                  </div>
              </div>
          )}

          <Button type="submit" disabled={isLoading} className={`w-full text-white mt-2 ${isShared ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Meta')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}