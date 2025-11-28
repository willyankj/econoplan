import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Skeleton className="h-[350px] rounded-xl" /> {/* Gráfico Principal */}
           <Skeleton className="h-[200px] rounded-xl" /> {/* Tabela */}
        </div>
        <div className="space-y-6">
           <Skeleton className="h-[300px] rounded-xl" /> {/* Widget Lateral */}
           <Skeleton className="h-[200px] rounded-xl" /> {/* Widget Lateral */}
        </div>
      </div>
    </div>
  );
}
