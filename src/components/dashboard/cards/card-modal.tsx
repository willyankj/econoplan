'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Loader2, Calendar, Pencil, Link as LinkIcon, Building2 } from "lucide-react";
import { upsertCard } from '@/app/dashboard/actions'; 
import { BankLogo } from "@/components/ui/bank-logo";
import { toast } from "sonner";

// Lista de bancos para seleção manual
const BANKS = [
  "Nubank", "Inter", "Itaú", "Bradesco", "Banco do Brasil", "Santander", 
  "C6 Bank", "XP Investimentos", "BTG Pactual", "Caixa", "Mercado Pago", 
  "PicPay", "PagBank", "Outro"
];

interface CardModalProps {
  accounts: any[];
  card?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CardModal({ accounts, card, open: controlledOpen, onOpenChange }: CardModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [linkedId, setLinkedId] = useState(card?.linkedAccountId || "none");
  const isEditing = !!card;
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name")?.toString().trim();
    const linkedAccountId = formData.get("linkedAccountId")?.toString();
    const bank = formData.get("bank")?.toString();
    
    if (!name) return toast.error("O apelido do cartão é obrigatório.");
    
    // Se não vinculou, exige o banco manual
    if (linkedAccountId === "none" && !bank) {
        return toast.error("Selecione uma conta vinculada ou informe a instituição financeira.");
    }

    setIsLoading(true);
    const result = await upsertCard(formData, card?.id);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro ao salvar", { description: result.error });
    } else {
        toast.success(isEditing ? "Atualizado com sucesso!" : "Cartão criado!");
        setOpen(false);
    }
  }

  const themeColor = "text-violet-500";
  const themeLightBg = "bg-violet-50 dark:bg-violet-950/20";

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!onOpenChange && (
          <DialogTrigger asChild>
            {isEditing ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-4 h-4" />
                </Button>
            ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Novo Cartão
                </Button>
            )}
          </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] p-0 gap-0 rounded-xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            {/* HEADER VISUAL */}
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider">
                        {isEditing ? "Editar Cartão" : "Novo Cartão de Crédito"}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input 
                        name="limit" 
                        type="number" 
                        step="0.01" 
                        placeholder="Limite 0,00" 
                        defaultValue={card?.limit} 
                        className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        autoFocus={!isEditing}
                    />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Limite total do cartão</p>
            </div>

            <div className="p-6 space-y-5">
                <div className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1">Apelido do Cartão</Label>
                        <Input 
                            name="name" 
                            defaultValue={card?.name} 
                            placeholder="Ex: Nubank Platinum..." 
                            className="bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all" 
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Conta Vinculada (Débito Automático)
                        </Label>
                        <Select name="linkedAccountId" value={linkedId} onValueChange={setLinkedId}>
                            <SelectTrigger className="bg-muted/50 border-transparent h-10 w-full">
                                <SelectValue placeholder="Selecione a conta..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="none">Não vincular (Manual)</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        <div className="flex items-center gap-2 w-full">
                                            <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                            <span className="font-medium">{acc.name}</span>
                                            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
                                                ({acc.bank})
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {/* Se não vinculou, mostra o seletor manual de banco */}
                        {linkedId === "none" ? (
                            <div className="mt-2 animate-in slide-in-from-top-2">
                                <Label className="text-xs text-muted-foreground ml-1 flex items-center gap-1 mb-1">
                                    <Building2 className="w-3 h-3" /> Instituição Financeira
                                </Label>
                                <Select name="bank" defaultValue={card?.bank}>
                                    <SelectTrigger className="bg-muted/50 border-transparent h-10 w-full">
                                        <SelectValue placeholder="Selecione o banco..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px]">
                                        {BANKS.map((bank) => (
                                            <SelectItem key={bank} value={bank}>
                                                <div className="flex items-center gap-2">
                                                    <BankLogo bankName={bank} className="w-4 h-4" />
                                                    {bank}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <p className="text-[10px] text-muted-foreground ml-1">
                                O banco do cartão será definido automaticamente pela conta vinculada.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Fecha dia
                            </Label>
                            <Input 
                                name="closingDay" 
                                type="number" 
                                min="1" max="31" 
                                defaultValue={card?.closingDay} 
                                placeholder="05" 
                                className="h-9 text-sm bg-background text-center" 
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Vence dia
                            </Label>
                            <Input 
                                name="dueDay" 
                                type="number" 
                                min="1" max="31" 
                                defaultValue={card?.dueDay} 
                                placeholder="12" 
                                className="h-9 text-sm bg-background text-center" 
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold h-12 shadow-md hover:scale-[1.02] transition-all">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Cartão')}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}