'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Repeat, Ban, Loader2, CalendarClock, AlertCircle } from "lucide-react";
import { stopTransactionRecurrence } from '@/app/dashboard/actions';
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RecurringModalProps {
  transactions: any[];
}

export function RecurringModal({ transactions }: RecurringModalProps) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleStop = async (id: string) => {
      setLoadingId(id);
      const result = await stopTransactionRecurrence(id);
      
      if (result?.error) {
          toast.error(result.error);
      } else {
          toast.success("Recorrência encerrada com sucesso!");
          router.refresh(); // Atualiza a lista
      }
      setLoadingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hidden sm:flex gap-2 border-dashed">
            <Repeat className="w-4 h-4 text-purple-500" />
            Recorrências
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-purple-500" />
            Gestão de Recorrências
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie suas receitas e despesas fixas ativas.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto mt-4 border border-border rounded-md">
            {transactions.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Repeat className="w-8 h-8 opacity-20" />
                    <p className="text-sm">Nenhuma recorrência ativa no momento.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Frequência</TableHead>
                            <TableHead>Próxima Cobrança</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        {t.description}
                                    </div>
                                    <div className="text-xs text-muted-foreground ml-4">
                                        {t.category?.name || 'Sem categoria'}
                                    </div>
                                </TableCell>
                                <TableCell className={t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}>
                                    {formatCurrency(t.amount)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {t.frequency === 'MONTHLY' ? 'Mensal' : t.frequency}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {t.nextRecurringDate ? new Date(t.nextRecurringDate).toLocaleDateString('pt-BR') : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                        onClick={() => handleStop(t.id)}
                                        disabled={!!loadingId}
                                        title="Cancelar Recorrência"
                                    >
                                        {loadingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                                        <span className="hidden sm:inline">Encerrar</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
        
        {transactions.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md flex gap-2 items-start text-xs text-amber-600 mt-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                    Ao encerrar uma recorrência, as cobranças futuras automáticas serão canceladas, mas o histórico de pagamentos passados será mantido.
                </p>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
