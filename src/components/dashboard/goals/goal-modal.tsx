'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, Plus, Pencil, Users, PieChart } from "lucide-react";
import { upsertGoal } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { Progress } from '@/components/ui/progress';

interface GoalModalProps {
  goal?: any;
  isShared?: boolean;
  workspaces?: { id: string; name: string }[]; // <--- Recebe lista de workspaces para definir regras
}

export function GoalModal({ goal, isShared = false, workspaces = [] }: GoalModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para regras de contribuição: { "workspaceId": 60, ... }
  const [rules, setRules] = useState<Record<string, number>>({});

  const isEditing = !!goal;

  // Inicializa as regras se estiver editando ou abrindo
  useEffect(() => {
      if (goal?.contributionRules) {
          setRules(goal.contributionRules as Record<string, number>);
      } else if (isShared && workspaces.length > 0) {
          // Se for nova meta compartilhada, tenta dividir igualmente por padrão
          const equalShare = Math.floor(100 / workspaces.length);
          const initialRules: Record<string, number> = {};
          workspaces.forEach(ws => initialRules[ws.id] = equalShare);
          setRules(initialRules);
      }
  }, [goal, isShared, workspaces, open]);

  const handleRuleChange = (wsId: string, val: string) => {
      const num = Math.min(100, Math.max(0, Number(val)));
      setRules(prev => ({ ...prev, [wsId]: num }));
  };

  // Calcula total para validar se fecha 100% (opcional, mas bom para UX)
  const totalPercentage = Object.values(rules).reduce((a, b) => a + b, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    
    // Adiciona as regras como JSON string se for compartilhada
    if (isShared) {
        formData.append('contributionRules', JSON.stringify(rules));
    }
    
    try {
        if (isEditing) {
            await upsertGoal(formData, goal.id);
            toast.success("Meta atualizada!");
        } else if (isShared) {
            await upsertGoal(formData, undefined, true);
            toast.success("Meta compartilhada criada!");
        } else {
            await upsertGoal(formData);
            toast.success("Meta criada!");
        }
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
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            {isShared ? <Users className="w-5 h-5 text-purple-500" /> : <Target className="w-5 h-5 text-emerald-500" />}
            {isEditing ? "Editar Meta" : (isShared ? "Criar Meta da Organização" : "Criar Nova Meta")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Objetivo</Label>
            <Input 
                id="name" 
                name="name" 
                defaultValue={goal?.name}
                placeholder="Ex: Viagem, Reserva..." 
                className="bg-muted border-border text-foreground" 
                required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="targetAmount">Valor da Meta (R$)</Label>
                <Input 
                    id="targetAmount" 
                    name="targetAmount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={goal?.targetAmount}
                    placeholder="10000.00" 
                    className="bg-muted border-border text-foreground" 
                    required 
                />
            </div>
            {/* Campo 'Já tenho' só aparece na criação de meta pessoal */}
            {!isEditing && !isShared && (
                <div className="grid gap-2">
                    <Label htmlFor="currentAmount">Já tenho (R$)</Label>
                    <Input 
                        id="currentAmount" 
                        name="currentAmount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="bg-muted border-border text-foreground" 
                    />
                </div>
            )}
             <div className="grid gap-2">
                <Label htmlFor="deadline">Prazo (Opcional)</Label>
                <Input 
                    id="deadline" 
                    name="deadline" 
                    type="date" 
                    defaultValue={formattedDeadline}
                    className="bg-muted border-border text-foreground" 
                />
            </div>
          </div>

          {/* SEÇÃO DE DIVISÃO DE CONTRIBUIÇÃO (Só para Shared) */}
          {isShared && workspaces.length > 0 && (
              <div className="border-t border-border pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                      <Label className="text-purple-400 flex items-center gap-2">
                          <PieChart className="w-4 h-4" /> Divisão de Responsabilidade
                      </Label>
                      <span className={`text-xs font-bold ${totalPercentage !== 100 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          Total: {totalPercentage}%
                      </span>
                  </div>
                  
                  <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                      {workspaces.map(ws => (
                          <div key={ws.id} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                  <span>{ws.name}</span>
                                  <span className="font-mono">{rules[ws.id] || 0}%</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  step="5"
                                  value={rules[ws.id] || 0}
                                  onChange={(e) => handleRuleChange(ws.id, e.target.value)}
                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                          </div>
                      ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                      Define quanto cada Workspace "deveria" contribuir. Isso ajuda a medir quem está adiantado ou atrasado.
                  </p>
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