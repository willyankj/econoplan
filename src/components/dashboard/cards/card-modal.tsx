'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Pencil, Loader2 } from "lucide-react";
import { upsertCard } from '@/app/dashboard/actions'; // Usa o arquivo index centralizado
import { BankLogo } from "@/components/ui/bank-logo";
import { toast } from "sonner";

interface CardModalProps {
  accounts: any[];
  card?: any; // Se passado, é edição
  open?: boolean; // Opcional, se quiser controlar externamente
  onOpenChange?: (open: boolean) => void;
}

export function CardModal({ accounts, card, open: controlledOpen, onOpenChange }: CardModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!card;
  
  // Lógica para usar estado controlado ou interno
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const result = await upsertCard(formData, card?.id);
    
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro", { description: result.error });
    } else {
        toast.success(isEditing ? "Cartão atualizado" : "Cartão criado");
        setOpen(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {/* Se não houver controle externo, renderiza o botão de trigger padrão */}
      {!onOpenChange && (
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Cartão
            </Button>
          </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            {isEditing ? "Editar Cartão" : "Adicionar Cartão"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
           <div className="grid gap-2">
            <Label>Apelido</Label>
            <Input 
                name="name" 
                defaultValue={card?.name} 
                placeholder="Ex: Nubank Platinum" 
                required 
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Banco</Label>
                <Select name="bank" defaultValue={card?.bank} required>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    {accounts.length === 0 ? (
                        <SelectItem value="GENERIC">Genérico (Sem contas cadastradas)</SelectItem>
                    ) : (
                        accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.bank}>
                                <div className="flex items-center gap-2">
                                    <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                    {acc.bank}
                                </div>
                            </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label>Limite (R$)</Label>
                <Input 
                    name="limit" 
                    type="number" 
                    step="0.01" 
                    defaultValue={card?.limit} 
                    placeholder="5000.00" 
                    required 
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Fechamento (Dia)</Label>
                <Input 
                    name="closingDay" 
                    type="number" 
                    min="1" max="31" 
                    defaultValue={card?.closingDay} 
                    placeholder="Ex: 05" 
                    required 
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
                />
            </div>
            <div className="grid gap-2">
                <Label>Vencimento (Dia)</Label>
                <Input 
                    name="dueDay" 
                    type="number" 
                    min="1" max="31" 
                    defaultValue={card?.dueDay} 
                    placeholder="Ex: 12" 
                    required 
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" 
                />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Cartão')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}