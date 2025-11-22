import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NewBudgetModal } from "@/components/dashboard/budgets/new-budget-modal";
import { BudgetCard } from "@/components/dashboard/budgets/budget-card";
import { PieChart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function BudgetsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: true }
  });

  if (!user || user.workspaces.length === 0) return <div>Sem workspace</div>;
  const workspaceId = user.workspaces[0].workspaceId;

  // Lógica de Mês
  const now = new Date();
  let currentDate = now;
  
  if (params.month) {
    const [y, m] = params.month.split('-');
    currentDate = new Date(parseInt(y), parseInt(m) - 1, 1);
  }

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Navegação
  const prevMonth = new Date(currentDate);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthStr = prevMonth.toISOString().slice(0, 7);

  const nextMonth = new Date(currentDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().slice(0, 7);

  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const categories = await prisma.category.findMany({
    where: { workspaceId, type: 'EXPENSE' },
    orderBy: { name: 'asc' }
  });

  const budgets = await prisma.budget.findMany({
    where: { workspaceId },
    include: { category: true }
  });

  const expenses = await prisma.transaction.findMany({
    where: {
      workspaceId,
      type: 'EXPENSE',
      date: { gte: firstDay, lte: lastDay }
    }
  });

  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(t => {
    if (t.categoryId) {
        const current = expensesByCategory[t.categoryId] || 0;
        expensesByCategory[t.categoryId] = current + Number(t.amount);
    }
  });

  const budgetData = budgets.map(b => ({
    id: b.id,
    categoryId: b.categoryId,
    categoryName: b.category?.name || 'Sem categoria',
    target: Number(b.targetAmount),
    spent: expensesByCategory[b.categoryId || ''] || 0,
    dateFrom: firstDay.toISOString().split('T')[0],
    dateTo: lastDay.toISOString().split('T')[0]
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Planejamento Mensal</h2>
          <p className="text-muted-foreground">Defina limites e controle seus gastos</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-1 rounded-lg border border-border shadow-sm">
            <Link href={`?month=${prevMonthStr}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></Button>
            </Link>
            <span className="text-sm font-medium capitalize min-w-[140px] text-center text-foreground">{monthLabel}</span>
            <Link href={`?month=${nextMonthStr}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></Button>
            </Link>
        </div>

        <NewBudgetModal categories={categories} />
      </div>

      {budgetData.length === 0 ? (
         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <PieChart className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhum orçamento definido.</p>
            <p className="text-sm">Clique em "Definir Orçamento" para começar.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetData.map(budget => (
                <BudgetCard key={budget.id} budget={budget} />
            ))}
        </div>
      )}
    </div>
  );
}