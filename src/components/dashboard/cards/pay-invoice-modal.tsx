'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { payCreditCardInvoice } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";
import { formatCurrency } from "@/lib/utils";

interface PayInvoiceModalProps {
  card: { id: string; name: string; bank: string };
  totalAmount: number;
  accounts: any[];
  invoicePeriod: { start: Date; end: Date };
}

export function PayInvoiceModal({ card, totalAmount, accounts, invoicePeriod }: PayInvoiceModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    formData.set('date', date);
    formData.set('amount', totalAmount.toString());
    // Passar o período exato da fatura que está sendo paga
    formData.set('startDate', invoicePeriod.start.toISOString());
    formData.set('endDate', invoicePeriod.end.toISOString());
    
    const result = await payCreditCardInvoice(formData);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro ao pagar fatura", { description: result.error });
    } else {
        toast.success("Fatura paga com sucesso!");
        setOpen(false);
    }
  }

  const themeColor = "text-rose-500";
  const themeBg = "bg-rose-500";
  const themeLightBg = "bg-rose-50 dark:bg-rose-950/20";

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="outline" 
            size="sm" 
            className="w-auto px-4 shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
        >
            <CreditCard className="w-4 h-4 mr-2" /> Pagar Fatura
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[450px] p-0 gap-0 rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            <div className={`p-6 pb-8 transition-colors duration-300 ${themeLightBg}`}>
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        Pagar Fatura: {card.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex justify-center items-center">
                    <span className={`text-2xl font-medium mr-2 opacity-50 ${themeColor}`}>R$</span>
                    <Input 
                        name="amount_display" 
                        type="text"
                        value={totalAmount.toFixed(2)}
                        readOnly
                        disabled
                        className={`text-5xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 h-16 w-full placeholder:text-muted-foreground/30 ${themeColor} cursor-not-allowed`}
                    />
                </div>
                <div className="flex items-center justify-center gap-1 mt-2 text-rose-600/80 bg-rose-100/50 py-1 px-3 rounded-full w-fit mx-auto">
                   <AlertTriangle className="w-3 h-3" />
                   <p className="text-[10px] font-medium">Pagamento parcial indisponível</p>
                </div>
            </div>

            <div className="p-6 space-y-5">
                <input type="hidden" name="cardId" value={card.id} />
                
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1">Pagar com qual conta?</Label>
                        <Select name="accountId" required>
                            <SelectTrigger className="bg-muted/50 border-transparent h-11 w-full">
                                <SelectValue placeholder="Selecione a conta de origem..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        <div className="flex items-center gap-2">
                                            <BankLogo bankName={acc.bank} className="w-4 h-4" />
                                            {acc.name}
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1">Data do Pagamento</Label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-10 bg-muted/50 border-transparent"
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" disabled={isLoading} className={`w-full text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02] ${themeBg} hover:opacity-90`}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Confirmar Pagamento'}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
