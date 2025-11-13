// src/app/(app)/dashboard/page.tsx
import MonthlySummaryCard from '@/components/MonthlySummaryCard';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Monthly Summary Widget */}
      <MonthlySummaryCard />

      {/* Other dashboard widgets can be added below */}
      <div className="mt-8">
        <p className="text-gray-600">
          Mais widgets e visualizações de dados serão adicionados aqui em breve.
        </p>
      </div>
    </div>
  );
}
