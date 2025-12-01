import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { CardModal } from "@/components/dashboard/cards/card-modal";
import { BankLogo } from "@/components/ui/bank-logo";
import { PayInvoiceModal } from "@/components/dashboard/cards/pay-invoice-modal";
import { CardActions } from "@/components/dashboard/cards/card-actions";
import { getUserWorkspace } from "@/lib/get-user-workspace";
import { formatCurrency } from "@/lib/utils";

export default async function CardsPage() {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Sem acesso.</div>;

  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const rawCards = await prisma.creditCard.findMany({
    where: { workspaceId },
    include: { transactions: { where: { date: { gte: firstDay, lte: lastDay } } } }
  });

  const cards = rawCards.map(c => ({
    ...c,
    limit: Number(c.limit),
    transactions: c.transactions.map(t => ({ ...t, amount: Number(t.amount), isPaid: t.isPaid }))
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meus Cartões</h2>
          <p className="text-muted-foreground">Gerencie limites e faturas</p>
        </div>
        <CardModal accounts={accounts} />
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
            const currentInvoice = card.transactions.reduce((acc, t) => {
                if (t.isPaid) return acc;
                if (t.type === 'EXPENSE') return acc + t.amount;
                if (t.type === 'INCOME') return acc - t.amount;
                return acc;
            }, 0);

            const percentage = Math.min((currentInvoice / card.limit) * 100, 100);
            const available = card.limit - currentInvoice; 

            return (
                <Card key={card.id} className="relative overflow-hidden bg-card border-border shadow-sm hover:border-primary/50 transition-all group">
                
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full -mr-10 -mt-10 pointer-events-none" />

                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-foreground flex items-center gap-3">
                    <BankLogo bankName={card.bank} className="w-8 h-8" />
                    <span className="text-lg">{card.name}</span>
                    </CardTitle>
                    <CardActions card={card} accounts={accounts} />
                </CardHeader>
                
                <CardContent className="space-y-6 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fatura Atual</p>
                            <h3 className="text-2xl font-bold text-foreground">
                                {formatCurrency(currentInvoice)}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Vence dia {card.dueDay}
                            </p>
                        </div>
                        
                        {/* CORREÇÃO AQUI: Passando o objeto 'card' inteiro */}
                        <PayInvoiceModal 
                            card={card}
                            totalAmount={currentInvoice}
                            accounts={accounts}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Usado: {Math.round(percentage)}%</span>
                            <span>Disponível: {formatCurrency(available)}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${percentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${percentage}%` }} 
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">Limite: {formatCurrency(card.limit)}</p>
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