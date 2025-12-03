'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Trash2, ArrowRightLeft, PiggyBank } from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DepositGoalModal } from "@/components/dashboard/goals/deposit-goal-modal";
import { formatCurrency } from "@/lib/utils";
import { deleteVault, upsertVault } from "@/app/dashboard/actions/finance";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface VaultManagerProps {
  accountId: string;
  accountName: string;
  vaults: any[];
  allAccounts: any[];
}

export function VaultManager({ accountId, accountName, vaults, allAccounts }: VaultManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('bankAccountId', accountId);
    
    // Passa valores padrão para garantir criação
    if(!formData.get('targetAmount')) formData.set('targetAmount', '0');
    
    const res = await upsertVault(formData);
    setLoading(false);
    
    if (res?.error) toast.error(res.error);
    else {
        toast.success("Cofrinho criado!");
        setIsCreateOpen(false);
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza? O cofrinho deve estar vazio.")) return;
      const res = await deleteVault(id);
      if (res?.error) toast.error(res.error);
      else toast.success("Cofrinho excluído!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h4 className="text-lg font-bold flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-500" />
                Cofrinhos de {accountName}
            </h4>
            <p className="text-xs text-muted-foreground">Dinheiro separado dentro desta conta.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <Plus className="w-4 h-4" /> Novo Cofrinho
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Criar Novo Cofrinho</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <div className="grid gap-2">
                        <Label>Nome</Label>
                        <Input name="name" required placeholder="Ex: Reserva de Emergência" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Saldo Inicial (Já guardado)</Label>
                        <Input name="initialBalance" type="number" step="0.01" placeholder="0.00" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Meta Alvo (Opcional)</Label>
                        <Input name="targetAmount" type="number" step="0.01" placeholder="Quanto quer juntar?" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Criando..." : "Criar Cofrinho"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      {vaults.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
              Você ainda não criou nenhum cofrinho nesta conta.
          </div>
      ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {vaults.map(vault => {
                  const percentage = vault.targetAmount > 0 
                    ? Math.min(100, (Number(vault.balance) / Number(vault.targetAmount)) * 100) 
                    : 0;

                  return (
                    <Card key={vault.id} className="overflow-hidden border-l-4 border-l-emerald-500 shadow-sm hover:shadow transition-all relative group">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="overflow-hidden pr-8">
                                    <h4 className="font-bold text-sm truncate" title={vault.name}>{vault.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Saldo Atual</p>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-3 h-3" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(vault.id)}>
                                                <Trash2 className="w-3 h-3 mr-2" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                                {formatCurrency(Number(vault.balance))}
                            </div>

                            {Number(vault.targetAmount) > 0 && (
                                <div className="space-y-1 mb-3">
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>{percentage.toFixed(0)}%</span>
                                        <span>Meta: {formatCurrency(Number(vault.targetAmount))}</span>
                                    </div>
                                    <Progress value={percentage} className="h-1.5 bg-emerald-100 dark:bg-emerald-950" indicatorClassName="bg-emerald-500" />
                                </div>
                            )}

                            <div className="flex gap-2">
                                <DepositGoalModal 
                                    goal={vault} 
                                    accounts={allAccounts}
                                    type="DEPOSIT"
                                    defaultAccountId={accountId} // FIX: Trava a conta atual
                                    label="Mover"
                                />
                            </div>
                        </CardContent>
                    </Card>
                  )
              })}
          </div>
      )}
    </div>
  );
}