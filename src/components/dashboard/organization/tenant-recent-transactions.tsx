'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Briefcase, PiggyBank } from "lucide-react"; 
import { formatCurrency } from "@/lib/utils"; 

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  workspace: { name: string };
  category: { name: string } | null;
}

export function TenantRecentTransactions({ transactions }: { transactions: Transaction[] }) {
  
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Últimas Movimentações da Organização</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[30%]">Descrição</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhuma movimentação recente.
                        </TableCell>
                    </TableRow>
                ) : (
                    transactions.map((t) => {
                        // --- CORREÇÃO AQUI: Verifica os novos nomes "Metas" e "Resgate de Metas" ---
                        const isInvestment = 
                            t.category?.name === "Metas" || 
                            t.category?.name === "Resgate de Metas" ||
                            t.category?.name === "Investimentos" || // Mantém compatibilidade com antigos
                            t.description.startsWith("Depósito Meta") ||
                            t.description.startsWith("Resgate Meta");

                        return (
                        <TableRow key={t.id} className="border-border hover:bg-muted/50">
                            <TableCell className="font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {t.type === 'INCOME' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span>{t.description}</span>
                                        {isInvestment && (
                                            <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                                                <PiggyBank className="w-3 h-3" /> Meta / Investimento
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-blue-500/5 text-blue-500 border-blue-500/20 hover:bg-blue-500/10 gap-1 font-normal">
                                    <Briefcase className="w-3 h-3" />
                                    {t.workspace.name}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {t.category?.name || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {new Date(t.date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                            </TableCell>
                        </TableRow>
                    )})
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}