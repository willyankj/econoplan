'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Loader2, CreditCard, Landmark, AlertTriangle, Ban } from "lucide-react";
import { upsertTransaction, stopTransactionRecurrence } from '@/app/dashboard/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryCombobox } from '@/components/dashboard/categories/category-combobox';
import { BankLogo } from "@/components/ui/bank-logo"; 
import { toast } from "sonner"; 

interface Props {
  transaction?: any;
  accounts?: any[];
  cards?: any[];
  categories?: any[];
}

export function TransactionModal({ transaction, accounts = [], cards = [], categories = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false); // Estado para o botão de cancelar recorrência
  
  // Estados
  const [paymentMethod, setPaymentMethod] = useState('ACCOUNT');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [recurrence, setRecurrence] = useState('NONE');
  const [installments, setInstallments] = useState(2);
  const [currentAmount, setCurrentAmount] = useState('');

  const isEditing = !!transaction;
  const currentType = isEditing ? transaction.type : type;
  
  const availableCategories = categories.filter(c => c.type === currentType);

  // Carrega valor na edição
  useEffect(() => {
      if (transaction?.amount) setCurrentAmount(String(transaction.amount));
  }, [transaction]);

  // Bloqueia cartão se for Receita
  useEffect(() => {
    if (type === 'INCOME') {
      setPaymentMethod('ACCOUNT');
    }
  }, [type]);

  // Função para cancelar recorrência
  const handleStopRecurrence = async () => {
    if (!confirm("Deseja parar de repetir esta despesa? As cobranças futuras automáticas serão canceladas.")) return;
    
    setIsStopping(true);
    const result = await stopTransactionRecurrence(transaction.id);
    setIsStopping(false);
    
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Recorrência cancelada!");
        setOpen(false);
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const description = formData.get("description")?.toString().trim();
    let amount = formData.get("amount")?.toString(); 
    const date = formData.get("date")?.toString();
    const category = formData.get("category")?.toString();

    // Lógica invertida para parcelamento (Valor da Parcela -> Total)
    if (!isEditing && recurrence === 'INSTALLMENT' && installments > 1) {
        const installmentValue = parseFloat(amount || "0");
        const totalValue = installmentValue * installments;
        amount = totalValue.toString();
        formData.set("amount", amount); 
    }

    if (!description) return toast.error("A descrição é obrigatória.");
    if (!amount || Number(amount) <= 0) return toast.error("O valor deve ser maior que zero.");
    if (!date) return toast.error("A data é obrigatória.");
    if (!category) return toast.error("Selecione uma categoria.");

    if (!isEditing) {
        if (paymentMethod === 'ACCOUNT' && !formData.get("accountId")) return toast.error("Selecione uma conta bancária.");
        if (paymentMethod === 'CREDIT_CARD' && !formData.get("cardId")) return toast.error("Selecione um cartão de crédito.");
    }

    setIsLoading(true);
    
    if (!isEditing) {
        formData.append('type', type);
        formData.append('paymentMethod', paymentMethod);
        formData.append('recurrence', recurrence);
        // installments já está no formData pelo input
    } else {
        formData.append('type', transaction.type);
    }

    const result = await upsertTransaction(formData, transaction?.id);
    setIsLoading(false);

    if (result?.error) toast.error(result.error);
    else {
        toast.success(isEditing ? "Transação atualizada!" : "Transação criada!");
        setOpen(false);
        if (!isEditing) {
            setRecurrence('NONE');
            setInstallments(2);
            setCurrentAmount('');
        }
    }
  }

  const defaultDate = transaction ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600">
                <Pencil className="w-4 h-4" />
            </Button>
        ) : (
            <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Nova Transação
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transação" : "Nova Transação"}</DialogTitle>
        </DialogHeader>
        
        {/* --- SEÇÃO DE ALERTA DE RECORRÊNCIA (NOVO) --- */}
        {isEditing && transaction?.isRecurring && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex flex-col gap-2 mb-2">
                <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4" />
                    Transação Recorrente
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Esta transação gera lançamentos automáticos todo mês.
                    </p>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleStopRecurrence}
                        disabled={isStopping}
                        className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                        {isStopping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3 mr-1" />}
                        Encerrar Recorrência
                    </Button>
                </div>
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          {/* 1. SELETOR DE TIPO */}
          {!isEditing && (
             <div className="grid grid-cols-2 gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
                <button 
                    type="button" 
                    onClick={() => setType('INCOME')} 
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${type === 'INCOME' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                >
                    Receita
                </button>
                <button 
                    type="button" 
                    onClick={() => setType('EXPENSE')} 
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                >
                    Despesa
                </button>
             </div>
          )}

          {/* 2. ABAS CONTA/CARTÃO */}
          {!isEditing && (
             <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-2 bg-muted/30 border border-border p-0.5 h-9 rounded-lg">
                    <TabsTrigger 
                        value="ACCOUNT"
                        className="text-xs h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground/80"
                    >
                        <Landmark className="w-3.5 h-3.5 mr-1.5" /> Conta
                    </TabsTrigger>
                    <TabsTrigger 
                        value="CREDIT_CARD" 
                        disabled={type === 'INCOME'}
                        className="text-xs h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground/80"
                    >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Cartão
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ACCOUNT" className="mt-2">
                    <Select name="accountId">
                        <SelectTrigger className="bg-background/50 border-border text-foreground h-10 text-sm">
                            <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 flex items-center justify-center rounded bg-muted/50 p-0.5 border border-border/50">
                                            <BankLogo bankName={a.bank} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-sm">{a.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TabsContent>

                <TabsContent value="CREDIT_CARD" className="mt-2">
                    <Select name="cardId">
                        <SelectTrigger className="bg-background/50 border-border text-foreground h-10 text-sm">
                            <SelectValue placeholder="Selecione o cartão..." />
                        </SelectTrigger>
                        <SelectContent>
                            {cards.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 flex items-center justify-center rounded bg-muted/50 p-0.5 border border-border/50">
                                            <BankLogo bankName={c.bank} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-sm">{c.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TabsContent>
             </Tabs>
          )}

          <div className="grid gap-2">
            <Label className="text-xs">Descrição</Label>
            <Input name="description" defaultValue={transaction?.description} className="bg-muted/30 border-border text-foreground h-10" placeholder="Ex: Compras do mês" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label className="text-xs">
                    {(!isEditing && recurrence === 'INSTALLMENT') ? 'Valor da Parcela (R$)' : 'Valor (R$)'}
                </Label>
                <Input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    value={currentAmount} 
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="bg-muted/30 border-border text-foreground h-10 font-semibold" 
                    placeholder="0,00" 
                />
            </div>
            <div className="grid gap-2">
                <Label className="text-xs">Data</Label>
                <Input name="date" type="date" defaultValue={defaultDate} className="bg-muted/30 border-border text-foreground h-10" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Categoria</Label>
            <CategoryCombobox 
                categories={availableCategories} 
                type={currentType}
                defaultValue={transaction?.category?.name || ''}
            />
          </div>

          {/* 3. SEÇÃO DE REPETIÇÃO */}
          {!isEditing && (
            <div className="bg-muted/20 p-3 rounded-lg border border-border/60 space-y-2.5 mt-1">
                <div className="flex items-center gap-2">
                    <Label className="text-[10px] uppercase text-muted-foreground/80 font-bold tracking-wider">Repetição</Label>
                    <div className="flex-1 h-px bg-border/60" />
                </div>
                
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={() => setRecurrence('NONE')}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${recurrence === 'NONE' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background/50 border-border hover:bg-accent text-muted-foreground'}`}
                    >
                        Única
                    </button>
                    <button 
                        type="button"
                        onClick={() => setRecurrence('MONTHLY')}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${recurrence === 'MONTHLY' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background/50 border-border hover:bg-accent text-muted-foreground'}`}
                    >
                        Fixa
                    </button>
                    
                    {paymentMethod === 'CREDIT_CARD' && type === 'EXPENSE' && (
                        <button 
                            type="button"
                            onClick={() => setRecurrence('INSTALLMENT')}
                            className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${recurrence === 'INSTALLMENT' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background/50 border-border hover:bg-accent text-muted-foreground'}`}
                        >
                            Parcelada
                        </button>
                    )}
                </div>

                {/* Input de Parcelas */}
                {recurrence === 'INSTALLMENT' && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 pt-1">
                        <Label className="text-xs whitespace-nowrap">Parcelas:</Label>
                        <div className="flex items-center gap-2 w-full">
                            <Input 
                                name="installments" 
                                type="number" 
                                min="2" max="24" 
                                value={installments}
                                onChange={(e) => setInstallments(parseInt(e.target.value))}
                                className="w-16 h-8 bg-background/80 border-border text-sm" 
                            />
                            {/* Mostra o TOTAL calculado automaticamente */}
                            <span className="text-xs text-muted-foreground truncate flex-1">
                                {installments > 0 && Number(currentAmount) > 0
                                    ? `Total: ${formatMoney(Number(currentAmount) * installments)}`
                                    : ''}
                            </span>
                        </div>
                    </div>
                )}
                
                <input type="hidden" name="recurrence" value={recurrence} />
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-4 h-11 font-semibold text-base shadow-md">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Confirmar Transação')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}