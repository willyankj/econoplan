import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreditCard, CheckCircle2, Clock, CheckCheck, PiggyBank } from "lucide-react";
import * as Icons from "lucide-react"; 

import { DeleteTransactionButton } from "./delete-button";
import { TransactionModal } from "@/components/dashboard/transaction-modal"; 
import { TransactionFilterButton } from "./filter-button";
import { SearchInput } from "./search-input";
import { ExportButton } from "./export-button";
import { BankLogo } from "@/components/ui/bank-logo";
import { getUserWorkspace } from "@/lib/get-user-workspace"; 
import { ImportTransactionsModal } from "@/components/dashboard/transactions/import-modal"; 
import { formatCurrency } from "@/lib/utils";

import { getRecurringTransactions } from "@/app/dashboard/actions";
import { RecurringModal } from "@/components/dashboard/transactions/recurring-modal";
import { PaginationControls } from "@/components/ui/pagination-controls";

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: Promise<{
      type?: string, q?: string, cardId?: string, accountId?: string,
      from?: string, to?: string, categoryId?: string, page?: string
  }>
}) {
  const { workspaceId, user } = await getUserWorkspace();
  if (!workspaceId || !user) redirect("/login");

  const params = await searchParams;

  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));

  const rawCards = await prisma.creditCard.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const cards = rawCards.map(c => ({ ...c, limit: Number(c.limit) }));

  const categories = await prisma.category.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });

  const rawGoals = await prisma.goal.findMany({
    where: {
      OR: [
        { workspaceId: workspaceId }, 
        { tenantId: user.tenantId, workspaceId: null } 
      ]
    },
    include: { vaults: { include: { bankAccount: true } } },
    orderBy: { name: 'asc' }
  });
  
  const goals = rawGoals
    .map(g => {
        const myVault = g.vaults.find(v => v.bankAccount.workspaceId === workspaceId);
        if (!myVault) return null;
        return {
            id: g.id,
            name: g.name,
            currentAmount: Number(g.currentAmount),
            vaultId: myVault.id,
            vault: {
                ...myVault,
                balance: Number(myVault.balance),
                bankAccount: myVault.bankAccount
            }
        };
    })
    .filter(g => g !== null);

  const recurringTransactions = await getRecurringTransactions();

  const whereCondition: any = { 
    workspaceId,
  };

  if (params.q) {
    whereCondition.OR = [
        { description: { contains: params.q, mode: 'insensitive' } },
        { category: { name: { contains: params.q, mode: 'insensitive' } } }
    ];
  }
  
  // CORREÇÃO DOS FILTROS
  if (params.type && params.type !== 'ALL') {
      if (params.type === 'INVESTMENT') {
          whereCondition.type = { in: ['VAULT_DEPOSIT', 'VAULT_WITHDRAW'] };
      } else {
          whereCondition.type = params.type;
      }
  }

  if (params.accountId && params.accountId !== 'ALL') whereCondition.bankAccountId = params.accountId;
  if (params.cardId && params.cardId !== 'ALL') whereCondition.creditCardId = params.cardId;
  
  if (params.categoryId && params.categoryId !== 'ALL') {
      whereCondition.categoryId = params.categoryId;
  }

  if (params.from && params.to) {
    whereCondition.date = {
      gte: new Date(params.from + "T00:00:00"),
      lte: new Date(params.to + "T23:59:59")
    };
  }

  // PAGINAÇÃO
  const page = Number(params.page) || 1;
  const itemsPerPage = 20;
  const skip = (page - 1) * itemsPerPage;

  const [totalItems, transactions] = await prisma.$transaction([
      prisma.transaction.count({ where: whereCondition }),
      prisma.transaction.findMany({
        where: whereCondition,
        orderBy: { date: 'desc' },
        skip: skip,
        take: itemsPerPage,
        include: {
            category: true,
            bankAccount: true,
            recipientAccount: true,
            creditCard: true,
            vault: { include: { goal: true } }
        }
      })
  ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

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
            {totalItems} lançamento(s) encontrado(s)
          </p>
        </div>
          
          <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap items-center">
            <RecurringModal transactions={recurringTransactions} />

            {!params.cardId && (
                <ImportTransactionsModal accounts={accounts} categories={categories} />
            )}
            
            <TransactionFilterButton accounts={accounts} cards={cards} categories={categories} />
            <ExportButton data={transactionsForExport} />

            <TransactionModal accounts={accounts} cards={cards} categories={categories} goals={goals} />
          </div>
      </div>

      <Card className="bg-card border-border shadow-sm overflow-hidden mx-1">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4 flex flex-row justify-between items-center gap-4">
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

                    const isInvestment = 
                        t.type === 'VAULT_DEPOSIT' || 
                        t.type === 'VAULT_WITHDRAW' ||
                        t.category?.name === "Metas" ||
                        t.vaultId;

                    return (
                    <TableRow key={t.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    t.type === 'INCOME' || t.type === 'VAULT_WITHDRAW' ? 'bg-emerald-500' : 
                                    (t.type === 'TRANSFER' ? 'bg-blue-500' : 'bg-rose-500')
                                }`} />
                                {t.description}
                            </div>
                            {isInvestment && (
                                <span className="text-[10px] text-amber-500 flex items-center gap-1 ml-4 mt-1">
                                    <PiggyBank className="w-3 h-3" /> 
                                    {t.vault?.goal?.name ? `Meta: ${t.vault.goal.name}` : (t.vault?.name || "Investimento")}
                                </span>
                            )}
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
                        {t.type === 'TRANSFER' && t.recipientAccount ? (
                            <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-200 font-normal w-fit gap-1">
                                    <Icons.ArrowRightLeft className="w-3 h-3" />
                                    Transferência
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {t.bankAccount?.name} <Icons.ArrowRight className="w-3 h-3" /> {t.recipientAccount.name}
                                </span>
                            </div>
                        ) : (t.type === 'VAULT_DEPOSIT' || t.type === 'VAULT_WITHDRAW') ? (
                             <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-200 font-normal w-fit gap-1">
                                    <Icons.PiggyBank className="w-3 h-3" />
                                    {t.type === 'VAULT_DEPOSIT' ? 'Aporte' : 'Resgate'}
                                </Badge>
                                {t.vault && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {t.vault.name}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-normal gap-1 pr-3">
                                {(() => {
                                    if (!t.category) return <span>Geral</span>;
                                    // @ts-ignore
                                    const CatIcon = Icons[t.category.icon] || Icons.Tag;
                                    return (
                                        <>
                                            <CatIcon className="w-3 h-3" style={{ color: t.category.color || 'inherit' }} />
                                            <span style={{ color: t.category.color || 'inherit' }}>{t.category.name}</span>
                                        </>
                                    );
                                })()}
                            </Badge>
                        )}
                    </TableCell>
                    
                    <TableCell className="text-muted-foreground">
                        {t.date.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${
                        t.type === 'INCOME' || t.type === 'VAULT_WITHDRAW' ? 'text-emerald-600' : (t.type === 'TRANSFER' ? 'text-blue-500' : 'text-rose-600')
                    }`}>
                        {t.type === 'INCOME' || t.type === 'VAULT_WITHDRAW' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </TableCell>
                    
                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                            <TransactionModal transaction={transactionForModal} accounts={accounts} cards={cards} categories={categories} goals={goals} />
                            <DeleteTransactionButton id={t.id} />
                        </div>
                    </TableCell>

                    </TableRow>
                )})}
                {totalItems === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <Icons.Ghost className="w-10 h-10 opacity-20" />
                                <p>Nenhum lançamento encontrado.</p>
                                <p className="text-xs opacity-50">Tente ajustar os filtros ou adicione uma nova transação.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalItems > 0 && (
            <div className="border-t border-border bg-muted/20">
                <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                />
            </div>
        )}
      </Card>
    </div>
  );
}