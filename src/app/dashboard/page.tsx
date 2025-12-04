import { DashboardOverview } from "@/components/dashboard/overview";
import { getUserWorkspace } from "@/lib/get-user-workspace";

import { 
    getWorkspaceCategoryComparison, 
    getUpcomingBills,
    getDashboardOverviewData
} from "@/app/dashboard/actions";

import { CategoryComparison } from "@/components/dashboard/analytics/category-comparison";
import { UpcomingBills } from "@/components/dashboard/upcoming-bills";

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ 
    month?: string, from?: string, to?: string
  }>
}) {
  const { workspaceId } = await getUserWorkspace();
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const params = await searchParams;

  const dashboardData = await getDashboardOverviewData(params);
  const comparisonData = await getWorkspaceCategoryComparison();
  const upcomingBills = await getUpcomingBills();

  return (
    <div className="space-y-8">
        <DashboardOverview data={dashboardData} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryComparison data={comparisonData} />
            <UpcomingBills bills={upcomingBills} />
        </div>
    </div>
  );
}