'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, Loader2, Pencil } from "lucide-react";
import { upsertAccount } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";

const BANKS = [
  "Nubank", "Inter", "Itaú", "Bradesco", "Banco do Brasil", "Santander", 
  "C6 Bank", "XP Investimentos", "BTG Pactual", "Caixa", "Mercado Pago", 
  "PicPay", "PagBank", "Outro"
];

interface AccountModalProps {
  account?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AccountModal({ account, open: controlledOpen, onOpenChange }: AccountModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!account;

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const name = formData.get("name")?.toString();
    const bank = formData.get("bank")?.toString();
    if (!name || !bank) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
    }

    setIsLoading(true);
    const result = await upsertAccount(formData, account?.id);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro ao salvar conta", { description: result.error });
    } else {
        toast.success(isEditing ? "Conta atualizada!" : "Conta criada!");
        setOpen(false);
    }
  }

  const themeColor = "text-emerald-500";
  const themeBg = "bg-emerald-600";
  const themeLightBg = "bg-emerald-50 dark:bg-emerald-950/20";

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
                    <Plus className="w-4 h-4 mr-2" /> Nova Conta
                </Button>
            )}
          </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] p-0 gap-0 rounded-xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider">
                        {isEditing ? "Editar Conta" : "Nova Conta Bancária"}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input 
                        name="balance" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        defaultValue={account?.balance} 
                        className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        autoFocus={!isEditing}
                    />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Saldo inicial da conta</p>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Nome da Conta</Label>
                    <Input name="name" defaultValue={account?.name} placeholder="Ex: Conta Corrente, Reserva..." className="bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all" required />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Instituição Financeira</Label>
                    <Select name="bank" defaultValue={account?.bank} required>
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

                <Button type="submit" disabled={isLoading} className={`w-full text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02] ${themeBg} hover:opacity-90`}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Conta')}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}