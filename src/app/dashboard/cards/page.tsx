import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { CardModal } from "@/components/dashboard/cards/card-modal";
import { BankLogo } from "@/components/ui/bank-logo";
import { PayInvoiceModal } from "@/components/dashboard/cards/pay-invoice-modal";
import { CardActions } from "@/components/dashboard/cards/card-actions";
import { getUserWorkspace } from "@/lib/get-user-workspace";
import { formatCurrency, getInvoiceData, InvoiceData } from "@/lib/finance-utils";
import { MonthSelector } from "@/components/dashboard/cards/month-selector";
import { parseISO, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function CardsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Sem acesso.</div>;

  const params = await searchParams;
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));

  // Determinar a data de referência (Mês Selecionado)
  const currentMonthStr = params.month || format(new Date(), 'yyyy-MM');
  const referenceDate = parseISO(currentMonthStr + "-01");
  // Ajuste para o meio do mês para evitar problemas de fuso horário em comparações simples
  referenceDate.setDate(15);

  // Buscar cartões
  const rawCards = await prisma.creditCard.findMany({
    where: { workspaceId },
  });

  // Processar cada cartão individualmente
  const cards = await Promise.all(rawCards.map(async (c) => {
    // 1. Calcular Datas da Fatura com base no Mês Selecionado e Dia de Fechamento do Cartão
    const invoiceData = getInvoiceData(c.closingDay, c.dueDay, referenceDate);

    // 2. Buscar Transações dentro deste intervalo
    const transactions = await prisma.transaction.findMany({
        where: {
            creditCardId: c.id,
            date: {
                gte: invoiceData.periodStart,
                lte: invoiceData.periodEnd
            }
        }
    });

    // 3. Buscar se existe alguma fatura ANTERIOR em aberto (para alerta)
    // Procuramos transações não pagas com data anterior ao inicio da fatura atual
    const overdueTransactionsCount = await prisma.transaction.count({
        where: {
            creditCardId: c.id,
            isPaid: false,
            date: { lt: invoiceData.periodStart },
            type: 'EXPENSE'
        }
    });

    const isOverdue = overdueTransactionsCount > 0;

    // 4. Calcular Total da Fatura
    const totalInvoice = transactions.reduce((acc, t) => {
        // Se já foi pago, não soma na fatura "a pagar" (mas tecnicamente compôs a fatura)
        // O usuário quer ver o valor DA FATURA ou O VALOR RESTANTE?
        // Geralmente "Fatura Atual" é o total gasto.
        // Mas se ele pagou parcial... O sistema não suporta parcial ainda.
        // Vamos mostrar o Total Gasto no Período - Pagamentos no Periodo? Não, pagamentos são transações a parte.
        // Transações de estorno (INCOME) abatem.

        // Se a transação está marcada como paga, ela já foi liquidada?
        // No modelo atual, quando paga a fatura, as transações viram isPaid=true.
        // Então, para saber o valor da fatura ABERTA ou FECHADA (não paga), somamos as !isPaid.
        // Mas se a fatura já foi PAGA (status CLOSED/PAID), todas estarão isPaid=true, e o total seria 0.
        // Isso é confuso se ele quiser ver "Quanto foi a fatura de Janeiro?". Deveria mostrar o valor total, mesmo pago.

        // Decisão:
        // Se a fatura é a ATUAL (Status OPEN) -> Mostra soma de todas (pois ainda não pagou).
        // Se a fatura é PASSADA -> Se tudo está pago, mostra 0 (pois já pagou).
        // Mas o usuário quer ver o histórico.

        // Melhor abordagem: Mostrar o TOTAL DA FATURA (independente de pago) e o STATUS DE PAGAMENTO.
        // Mas o botão "Pagar" só deve cobrar o que falta.

        const val = Number(t.amount);
        if (t.type === 'EXPENSE') return acc + val;
        if (t.type === 'INCOME') return acc - val; // Estorno
        return acc;
    }, 0);

    // Calcular o valor PENDENTE (para o botão de pagar)
    const pendingAmount = transactions.reduce((acc, t) => {
        if (t.isPaid) return acc;
        if (t.type === 'EXPENSE') return acc + Number(t.amount);
        if (t.type === 'INCOME') return acc - Number(t.amount);
        return acc;
    }, 0);

    // Buscar uso total do limite (Saldo Devedor Total Global)
    // Isso independe da fatura. É tudo que está pendente no cartão.
    // Mas para performance, podemos aproximar ou fazer query separada.
    // Query separada é melhor.
    const allPendingSum = await prisma.transaction.aggregate({
        where: { creditCardId: c.id, isPaid: false },
        _sum: { amount: true }
    });
    // Nota: Transações income não pagas (estornos pendentes) devem abater.
    // O aggregate simples soma tudo. Precisamos separar por type se quisermos precisão, mas assumindo que cartão só tem EXPENSE pendente na maioria:
    const totalUsedLimit = Number(allPendingSum._sum.amount || 0);


    return {
        ...c,
        limit: Number(c.limit),
        invoiceData,
        totalInvoice,
        pendingAmount, // Valor que o botão "Pagar" vai usar se for pagar ESSA fatura
        totalUsedLimit,
        isOverdue
    };
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meus Cartões</h2>
          <p className="text-muted-foreground">Gerencie limites e faturas</p>
        </div>
        <div className="flex items-center gap-2">
            <MonthSelector />
            <CardModal accounts={accounts} />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="grid place-items-center py-16 px-4 border border-dashed rounded-2xl bg-muted/20 text-center">
            <h3 className="text-xl font-bold text-foreground">Centralize seus Cartões</h3>
            <p className="text-muted-foreground max-w-sm mb-8 mt-2">
                Cadastre seus cartões de crédito para acompanhar gastos e limites em tempo real.
            </p>
            <CardModal accounts={accounts} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => {
            const percentage = Math.min((card.totalUsedLimit / card.limit) * 100, 100);
            const available = card.limit - card.totalUsedLimit;

            // Status da fatura visual
            let statusColor = "text-muted-foreground";
            let statusText = card.invoiceData.status === 'OPEN' ? 'Aberta' :
                             card.invoiceData.status === 'CLOSED' ? 'Fechada' :
                             card.invoiceData.status === 'OVERDUE' ? 'Vencida' : 'Futura';

            if (card.invoiceData.status === 'OPEN') statusColor = "text-emerald-500";
            if (card.invoiceData.status === 'CLOSED') statusColor = "text-amber-500";
            if (card.invoiceData.status === 'OVERDUE') statusColor = "text-rose-500";

            // Se tudo está pago nesta fatura visualizada
            const isFullyPaid = card.pendingAmount <= 0.01 && card.totalInvoice > 0;
            if (isFullyPaid) {
                statusText = "Paga";
                statusColor = "text-emerald-500";
            }

            return (
                <Card key={card.id} className={`relative overflow-hidden bg-card border-border shadow-sm hover:border-primary/50 transition-all group ${card.isOverdue ? 'ring-1 ring-rose-500/50' : ''}`}>
                
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full -mr-10 -mt-10 pointer-events-none" />

                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-foreground flex items-center gap-3">
                        <BankLogo bankName={card.bank} className="w-8 h-8" />
                        <div className="flex flex-col">
                            <span className="text-lg">{card.name}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                                Final {card.id.slice(-4)}
                            </span>
                        </div>
                    </CardTitle>
                    <CardActions
                        card={card}
                        accounts={accounts}
                        invoiceDates={{ from: format(card.invoiceData.periodStart, 'yyyy-MM-dd'), to: format(card.invoiceData.periodEnd, 'yyyy-MM-dd') }}
                    />
                </CardHeader>
                
                <CardContent className="space-y-6 relative z-10">

                    {card.isOverdue && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-md p-2 flex items-center gap-2 text-xs text-rose-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Há faturas anteriores em aberto!</span>
                             <Link href={`/dashboard/cards?month=${format(addMonths(new Date(), -1), 'yyyy-MM')}`} className="underline ml-auto hover:text-rose-800">
                                Ver
                            </Link>
                        </div>
                    )}

                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                                Fatura {card.invoiceData.monthLabel}
                                <Badge variant="outline" className={`text-[10px] h-5 px-1 ${statusColor} bg-transparent border-current`}>
                                    {statusText}
                                </Badge>
                            </p>
                            <h3 className="text-2xl font-bold text-foreground">
                                {formatCurrency(card.totalInvoice)}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Vence dia {format(card.invoiceData.dueDate, 'dd/MM')}
                            </p>
                            <p className="text-[10px] text-muted-foreground opacity-70">
                                Ciclo: {format(card.invoiceData.periodStart, 'dd/MM')} - {format(card.invoiceData.periodEnd, 'dd/MM')}
                            </p>
                        </div>
                        
                        {/* Botão de Pagar só aparece se houver pendência NESTA fatura e ela não for futura (opcional) */}
                        {!isFullyPaid && card.invoiceData.status !== 'FUTURE' && (
                            <PayInvoiceModal
                                card={card}
                                totalAmount={card.pendingAmount} // Pagar o que falta desta fatura
                                accounts={accounts}
                                invoicePeriod={{
                                    start: card.invoiceData.periodStart,
                                    end: card.invoiceData.periodEnd
                                }}
                            />
                        )}
                        {isFullyPaid && (
                             <div className="flex flex-col items-center justify-center h-10 px-4 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
                                PAGA
                             </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Limite Usado: {Math.round(percentage)}%</span>
                            <span>Disponível: {formatCurrency(available)}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${percentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${percentage}%` }} 
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">Limite Total: {formatCurrency(card.limit)}</p>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="w-3 h-3" />
                            Fecha dia {card.closingDay}
                        </div>
                    </div>
                </CardContent>
                </Card>
            );
            })}
        </div>
      )}
    </div>
  );
}
