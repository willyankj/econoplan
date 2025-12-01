'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CalendarIcon, Plus, CreditCard as CreditCardIcon, RefreshCw, Layers, Pencil } from "lucide-react";
import { upsertTransaction } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountModal } from "@/components/dashboard/accounts/account-modal";
import { CardModal } from "@/components/dashboard/cards/card-modal";
import { CategoryModal } from "@/components/dashboard/categories/category-modal";
import { BankLogo } from "@/components/ui/bank-logo";
import * as Icons from "lucide-react";

interface TransactionModalProps {
  transaction?: any;
  accounts: any[];
  cards: any[];
  categories: any[];
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionModal({ transaction, accounts, cards, categories, children, open: controlledOpen, onOpenChange }: TransactionModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(transaction?.type || 'EXPENSE');
  const [date, setDate] = useState<Date>(transaction?.date ? new Date(transaction.date) : new Date());
  
  // Controle de Abas/Método de Pagamento
  const [paymentMethod, setPaymentMethod] = useState(transaction?.creditCardId ? "card" : "account");

  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring || !!transaction?.isInstallment || false);
  const [recurrence, setRecurrence] = useState(transaction?.frequency || (transaction?.isInstallment ? 'INSTALLMENT' : 'MONTHLY'));
  const [installments, setInstallments] = useState(transaction?.installmentTotal || 2);
  
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const isEditing = !!transaction;
  const themeColor = type === 'EXPENSE' ? 'text-rose-500' : (type === 'INCOME' ? 'text-emerald-500' : 'text-blue-500');
  const themeBg = type === 'EXPENSE' ? 'bg-rose-500' : (type === 'INCOME' ? 'bg-emerald-500' : 'bg-blue-500');

  // Resetar recorrência inválida se mudar método de pagamento
  useEffect(() => {
    if (paymentMethod === 'account' && recurrence === 'INSTALLMENT') {
        setRecurrence('MONTHLY');
    }
  }, [paymentMethod, recurrence]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set('date', date.toISOString().split('T')[0]);
    formData.set('type', type);
    
    // Forçar paymentMethod correto baseado na aba ativa
    if (type !== 'TRANSFER') {
        formData.set('paymentMethod', paymentMethod === 'card' ? 'CREDIT_CARD' : 'ACCOUNT');
    }

    if (isRecurring) {
        formData.set('recurrence', recurrence);
        if (recurrence === 'INSTALLMENT') {
            formData.set('installments', installments.toString());
        }
    }
    const result = await upsertTransaction(formData, transaction?.id);
    setIsLoading(false);
    if (result?.error) {
        toast.error("Erro ao salvar", { description: result.error });
    } else {
        toast.success(isEditing ? "Transação atualizada!" : "Transação criada!");
        setOpen(false);
    }
  }

  const renderCategoryIcon = (iconName: string, color: string) => {
      // @ts-ignore
      const Icon = Icons[iconName] || Icons.Circle;
      return <Icon className="w-4 h-4 mr-2" style={{ color: color }} />;
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!onOpenChange && (
          <DialogTrigger asChild>
            {children ? children : (
                isEditing ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-semibold rounded-full px-6 h-11">
                        <Plus className="w-5 h-5 mr-2" /> Nova Transação
                    </Button>
                )
            )}
          </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-thin p-0 gap-0 rounded-xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className={`p-6 pb-8 transition-colors duration-300 ${type === 'EXPENSE' ? 'bg-rose-50 dark:bg-rose-950/20' : (type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-blue-50 dark:bg-blue-950/20')}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider">
                        {isEditing ? "Editar Movimentação" : "Nova Movimentação"}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input name="amount" type="number" step="0.01" placeholder="0,00" defaultValue={transaction?.amount} className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} autoFocus={!isEditing} required />
                </div>

                <div className="flex justify-center mt-6">
                    <div className="bg-background/50 p-1 rounded-full border border-border shadow-sm flex gap-1">
                        <button type="button" onClick={() => setType('EXPENSE')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>Despesa</button>
                        <button type="button" onClick={() => setType('INCOME')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>Receita</button>
                        <button type="button" onClick={() => setType('TRANSFER')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'TRANSFER' ? 'bg-blue-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}>Transf.</button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid grid-cols-[1fr,auto] gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1">Descrição</Label>
                        <Input name="description" placeholder="Ex: Mercado..." defaultValue={transaction?.description} className="bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all" required />
                    </div>
                    <div className="grid gap-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground ml-1">Data</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-muted/50 border-transparent hover:bg-background", !date && "text-muted-foreground")}>{date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {type !== 'TRANSFER' && (
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1 flex justify-between">
                            Categoria
                            <span className="text-[10px] text-primary cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCategoryModal(true); }}>+ Criar nova</span>
                        </Label>
                        <div className="flex gap-2">
                            <Select name="categoryId" defaultValue={transaction?.categoryId}>
                                <SelectTrigger className="bg-muted/50 border-transparent w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {categories.filter(c => c.type === type).map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            <div className="flex items-center">{renderCategoryIcon(cat.icon, cat.color)}{cat.name}</div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="button" size="icon" variant="secondary" className="shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCategoryModal(true); }}><Plus className="w-4 h-4" /></Button>
                        </div>
                    </div>
                )}

                {type === 'TRANSFER' ? (
                    <div className="flex flex-col gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-blue-600 dark:text-blue-400 font-bold ml-1">De onde sai?</Label>
                            <div className="flex gap-2">
                                <Select name="accountId">
                                    <SelectTrigger className="bg-background border-border text-foreground w-full"><SelectValue placeholder="Conta Origem" /></SelectTrigger>
                                    <SelectContent>{accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}><div className="flex items-center gap-2"><BankLogo bankName={acc.bank} className="w-4 h-4" />{acc.name}</div></SelectItem>))}</SelectContent>
                                </Select>
                                <Button type="button" size="icon" variant="secondary" className="shrink-0 bg-background hover:bg-muted" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAccountModal(true); }}><Plus className="w-4 h-4" /></Button>
                            </div>
                        </div>
                        <div className="relative h-4 flex items-center justify-center">
                            <div className="absolute inset-x-0 top-1/2 h-px bg-blue-200 dark:bg-blue-800/50"></div>
                            <div className="relative bg-blue-50 dark:bg-slate-900 px-2 text-[10px] text-blue-400 uppercase font-bold">Para</div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-blue-600 dark:text-blue-400 font-bold ml-1">Para onde vai?</Label>
                            <div className="flex gap-2">
                                <Select name="destinationAccountId">
                                    <SelectTrigger className="bg-background border-border text-foreground w-full"><SelectValue placeholder="Conta Destino" /></SelectTrigger>
                                    <SelectContent>{accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}><div className="flex items-center gap-2"><BankLogo bankName={acc.bank} className="w-4 h-4" />{acc.name}</div></SelectItem>))}</SelectContent>
                                </Select>
                                <Button type="button" size="icon" variant="secondary" className="shrink-0 bg-background hover:bg-muted" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAccountModal(true); }}><Plus className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/50 p-1 mb-2">
                            <TabsTrigger value="account" className="text-xs font-medium">Conta Bancária</TabsTrigger>
                            <TabsTrigger value="card" className="text-xs font-medium" disabled={type === 'INCOME'}>Cartão de Crédito</TabsTrigger>
                        </TabsList>
                        <TabsContent value="account" className="mt-0">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-muted-foreground ml-1 flex justify-between">Conta Selecionada<span className="text-[10px] text-primary cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAccountModal(true); }}>+ Nova Conta</span></Label>
                                <div className="flex gap-2">
                                    <Select name="accountId" defaultValue={transaction?.bankAccountId}>
                                        <SelectTrigger className="bg-muted/50 border-transparent w-full"><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                                        <SelectContent>{accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}><div className="flex items-center gap-2"><BankLogo bankName={acc.bank} className="w-4 h-4" /><span className="truncate">{acc.name}</span><span className="text-xs text-muted-foreground ml-auto">{formatCurrency(acc.balance)}</span></div></SelectItem>))}</SelectContent>
                                    </Select>
                                    <Button type="button" size="icon" variant="secondary" className="shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAccountModal(true); }}><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="card" className="mt-0">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-muted-foreground ml-1 flex justify-between">Cartão Selecionado<span className="text-[10px] text-primary cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCardModal(true); }}>+ Novo Cartão</span></Label>
                                <div className="flex gap-2">
                                    <Select name="cardId" defaultValue={transaction?.creditCardId}>
                                        <SelectTrigger className="bg-muted/50 border-transparent w-full"><SelectValue placeholder="Selecione o cartão..." /></SelectTrigger>
                                        <SelectContent>{cards.map(card => (<SelectItem key={card.id} value={card.id}><div className="flex items-center gap-2"><CreditCardIcon className="w-4 h-4 text-muted-foreground" />{card.name}</div></SelectItem>))}</SelectContent>
                                    </Select>
                                    <Button type="button" size="icon" variant="secondary" className="shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCardModal(true); }}><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                {type !== 'TRANSFER' && (
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(c) => setIsRecurring(!!c)} />
                            <Label htmlFor="recurring" className="text-xs font-medium cursor-pointer flex items-center gap-1"><RefreshCw className="w-3 h-3 text-muted-foreground" /> Repetir ou Parcelar?</Label>
                        </div>
                        {isRecurring && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase">Frequência</Label>
                                    <Select value={recurrence} onValueChange={setRecurrence}>
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MONTHLY">Mensal (Fixo)</SelectItem>
                                            <SelectItem value="WEEKLY">Semanal</SelectItem>
                                            <SelectItem value="YEARLY">Anual</SelectItem>
                                            {/* Correção: Parcelamento APENAS para Despesas no Cartão */}
                                            {type === 'EXPENSE' && paymentMethod === 'card' && <SelectItem value="INSTALLMENT">Parcelado</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {recurrence === 'INSTALLMENT' && type === 'EXPENSE' && paymentMethod === 'card' && (
                                    <div className="grid gap-1.5">
                                        <Label className="text-[10px] text-muted-foreground uppercase">Parcelas</Label>
                                        <div className="relative">
                                            <Layers className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
                                            <Input type="number" min="2" max="100" value={installments} onChange={e => setInstallments(Number(e.target.value))} className="h-8 text-xs bg-background pl-7" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <Button type="submit" disabled={isLoading} className={`w-full text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02] ${themeBg} hover:opacity-90`}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Confirmar')}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>

    <CategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />
    <AccountModal open={showAccountModal} onOpenChange={setShowAccountModal} />
    <CardModal open={showCardModal} onOpenChange={setShowCardModal} accounts={accounts} />
    </>
  );
}