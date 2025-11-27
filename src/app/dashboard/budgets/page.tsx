import { prisma } from "@/lib/prisma";
import { BudgetModal } from "@/components/dashboard/budgets/budget-modal";
import { BudgetCard } from "@/components/dashboard/budgets/budget-card";
import { PieChart } from "lucide-react";
import { getUserWorkspace } from "@/lib/get-user-workspace";
import { DateMonthSelector } from "@/components/dashboard/date-month-selector"; // <--- 1. IMPORTAR

export const dynamic = 'force-dynamic';

export default async function BudgetsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string, from?: string, to?: string }> // <--- 2. TIPAGEM ATUALIZADA
}) {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const params = await searchParams;
  
  // --- 3. NOVA LÓGICA DE DATA (IGUAL À ORG) ---
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (params.from && params.to) {
    // Intervalo personalizado
    startDate = new Date(params.from + "T00:00:00");
    endDate = new Date(params.to + "T23:59:59");
  } else {
    // Mês Padrão
    let dateRef = now;
    if (params.month) {
      const [y, m] = params.month.split('-');
      dateRef = new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    startDate = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
    endDate = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0, 23, 59, 59);
  }
  // --------------------------------------------

  const categories = await prisma.category.findMany({ where: { workspaceId, type: 'EXPENSE' }, orderBy: { name: 'asc' } });
  const budgets = await prisma.budget.findMany({ where: { workspaceId }, include: { category: true } });
  
  // Usa startDate e endDate calculados acima
  const expenses = await prisma.transaction.findMany({
    where: { 
        workspaceId, 
        type: 'EXPENSE', 
        date: { gte: startDate, lte: endDate } 
    }
  });

  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(t => {
    if (t.categoryId) expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + Number(t.amount);
  });

  const budgetData = budgets.map(b => ({
    id: b.id, 
    categoryId: b.categoryId, 
    categoryName: b.category?.name || 'Sem categoria',
    target: Number(b.targetAmount), 
    spent: expensesByCategory[b.categoryId || ''] || 0,
    dateFrom: startDate.toISOString().split('T')[0], 
    dateTo: endDate.toISOString().split('T')[0]
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Planejamento</h2>
          <p className="text-muted-foreground">Defina limites e controle seus gastos</p>
        </div>
        
        <div className="flex items-center gap-4">
            {/* 4. COMPONENTE SUBSTITUÍDO */}
            <DateMonthSelector /> 
            <BudgetModal categories={categories} />
        </div>
      </div>

      {budgetData.length === 0 ? (
         <div className="flex flex-col items-center justify-center p-16 border border-rose-500/20 rounded-xl bg-gradient-to-b from-rose-500/5 to-transparent text-muted-foreground">
            <div className="p-5 bg-rose-100 dark:bg-rose-900/30 rounded-full mb-5 animate-pulse">
                <PieChart className="w-12 h-12 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Planeje seus Gastos</h3>
            <p className="text-sm max-w-md text-center mb-6">
                Defina um teto para categorias como "Mercado" ou "Lazer" e o Econoplan te avisa antes do dinheiro acabar.
            </p>
            <BudgetModal categories={categories} />
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