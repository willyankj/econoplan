import { prisma } from "@/lib/prisma";
import { getUserWorkspace } from "@/lib/get-user-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryModal } from "@/components/dashboard/categories/category-modal";
import { Trash2, Tag } from "lucide-react";
import { deleteCategory } from "@/app/dashboard/actions/categories";
import * as Icons from "lucide-react";

export default async function CategoriesPage() {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const categories = await prisma.category.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { transactions: true } } }
  });

  const expenses = categories.filter(c => c.type === 'EXPENSE');
  const incomes = categories.filter(c => c.type === 'INCOME');

  const CategoryList = ({ items }: { items: typeof categories }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(cat => {
        // @ts-ignore
        const Icon = Icons[cat.icon] || Icons.Tag;
        return (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg shadow-sm hover:border-primary/50 transition-colors group">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat.color || '#94a3b8' }}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat._count.transactions} transações</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CategoryModal category={cat} />
                    <form action={async () => { 'use server'; await deleteCategory(cat.id); }}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                    </form>
                </div>
            </div>
        )
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-foreground">Categorias</h2>
            <p className="text-muted-foreground">Organize seus lançamentos por grupos.</p>
        </div>
        <CategoryModal />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" /> Despesas
        </h3>
        <CategoryList items={expenses} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500" /> Receitas
        </h3>
        <CategoryList items={incomes} />
      </div>
    </div>
  );
}
