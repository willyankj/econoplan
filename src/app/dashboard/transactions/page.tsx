import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreditCard, CheckCircle2, Clock, CheckCheck } from "lucide-react";

import { DeleteTransactionButton } from "./delete-button";
import { EditTransactionModal } from "@/components/dashboard/edit-transaction-modal";
import { TransactionFilterButton } from "./filter-button";
import { SearchInput } from "./search-input";
import { ExportButton } from "./export-button";
import { BankLogo } from "@/components/ui/bank-logo";
import { getUserWorkspace } from "@/lib/get-user-workspace"; 
import { ImportTransactionsModal } from "@/components/dashboard/transactions/import-modal"; 

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string, q?: string, cardId?: string, accountId?: string, from?: string, to?: string, categoryId?: string }>
}) {
  const { workspaceId, user } = await getUserWorkspace();
  if (!workspaceId || !user) redirect("/login");

  const params = await searchParams;

  // 1. BUSCA DADOS AUXILIARES
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));

  const rawCards = await prisma.creditCard.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const cards = rawCards.map(c => ({ ...c, limit: Number(c.limit) }));

  const categories = await prisma.category.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });

  // 2. CONSTRUÇÃO DO FILTRO (WHERE)
  const whereCondition: any = { 
    workspaceId,
    // Soft Delete: garante que não pega itens excluídos se você implementou isso em transações também
    // deletedAt: null, 
  };

  // Filtro de Texto (Busca)
  if (params.q) {
    whereCondition.OR = [
        { description: { contains: params.q, mode: 'insensitive' } },
        { category: { name: { contains: params.q, mode: 'insensitive' } } }
    ];
  }
  
  // Filtros Específicos
  if (params.type && params.type !== 'ALL') whereCondition.type = params.type;
  if (params.accountId) whereCondition.bankAccountId = params.accountId;
  if (params.cardId) whereCondition.creditCardId = params.cardId;
  
  // CORREÇÃO PRINCIPAL: Filtro de Categoria
  // Antes talvez não estivesse pegando o categoryId da URL corretamente
  if (params.categoryId && params.categoryId !== 'ALL') {
      whereCondition.categoryId = params.categoryId;
  }

  // CORREÇÃO DE DATAS:
  // Se vier da URL (Orçamento), usa as datas exatas.
  // Se não vier, não aplica filtro de data (mostra tudo) OU aplica mês atual (depende da sua regra).
  // Aqui vou deixar a lógica: Se tem data, usa. Se não tem, mostra as últimas 100 (padrão do prisma take).
  if (params.from && params.to) {
    whereCondition.date = {
      gte: new Date(params.from + "T00:00:00"),
      lte: new Date(params.to + "T23:59:59")
    };
  }

  const transactions = await prisma.transaction.findMany({
    where: whereCondition,
    orderBy: { date: 'desc' },
    take: 100, // Limite de segurança
    include: { category: true, bankAccount: true, creditCard: true }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const transactionsForExport = transactions.map(t => ({
    description: t.description,
    category: t.category,
    date: t.date,
    type: t.type,
    amount: Number(t.amount)
  }));

  return (
    <div className="space-y-6 max-w-[100vw] overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {params.cardId ? 'Extrato do Cartão' : 'Extrato Geral'}
          </h2>
          <p className="text-muted-foreground">
            {transactions.length} lançamento(s) encontrado(s)
          </p>
        </div>
          <div className="flex gap-2 w-full md:w-auto">
            {!params.cardId && 
              <>
                <ImportTransactionsModal accounts={accounts} />
                <TransactionFilterButton accounts={accounts} cards={cards} categories={categories} />
              </>
            }
            <ExportButton data={transactionsForExport} />
          </div>
      </div>

      <Card className="bg-card border-border shadow-sm overflow-hidden mx-1">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
            <SearchInput />
        </CardHeader>
        
        <CardContent className="p-0 w-full overflow-x-auto max-w-[calc(100vw-3rem)] md:max-w-none">
          <div className="min-w-[1000px]">
            <Table>
                <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-[25%]">Descrição</TableHead>
                    <TableHead className="text-muted-foreground">Origem</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Categoria</TableHead>
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                    <TableHead className="w-[100px] text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {transactions.map((t) => {
                    const transactionForModal = {
                        ...t, amount: Number(t.amount), bankAccount: undefined, creditCard: undefined   
                    };

                    return (
                    <TableRow key={t.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {t.description}
                        </div>
                    </TableCell>
                    
                    <TableCell>
                        {t.creditCard ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <CreditCard className="w-3 h-3" />
                                {t.creditCard.name}
                            </div>
                        ) : t.bankAccount ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <BankLogo bankName={t.bankAccount.bank} className="w-3 h-3" />
                                {t.bankAccount.name}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </TableCell>

                    <TableCell>
                        {t.creditCard ? (
                            t.isPaid ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-normal">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Paga na Fatura
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-normal">
                                    <Clock className="w-3 h-3 mr-1" /> Fatura Aberta
                                </Badge>
                            )
                        ) : (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs opacity-70">
                                <CheckCheck className="w-3 h-3" /> Liquidado
                            </div>
                        )}
                    </TableCell>

                    <TableCell>
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-normal">
                            {t.category?.name || 'Geral'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {t.date.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </TableCell>
                    
                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                            <EditTransactionModal transaction={transactionForModal} />
                            <DeleteTransactionButton id={t.id} />
                        </div>
                    </TableCell>

                    </TableRow>
                )})}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}