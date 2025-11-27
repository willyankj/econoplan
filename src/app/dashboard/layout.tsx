import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';

import { SidebarUI } from '@/components/dashboard/sidebar-ui';
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar';
import { TransactionModal } from '@/components/dashboard/transaction-modal';

import { NotificationBell } from "@/components/dashboard/notifications/notification-bell";
import { getNotifications } from "@/app/dashboard/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { 
        tenant: true,
        workspaces: { include: { workspace: true } } 
    }
  });

  if (!user || user.workspaces.length === 0) return <div>Sem workspace</div>;
  
  const tenantName = user.tenant.name;
  const role = user.role === 'OWNER' ? 'Proprietário' : 'Membro';
  const workspaces = user.workspaces.map(wm => ({
    id: wm.workspace.id,
    name: wm.workspace.name
  }));

  const cookieStore = await cookies();
  const activeWorkspaceCookie = cookieStore.get('activeWorkspaceId')?.value;
  const activeWorkspaceId = activeWorkspaceCookie || workspaces[0]?.id;

  const currentWorkspaceId = workspaces.find(w => w.id === activeWorkspaceId) ? activeWorkspaceId : workspaces[0].id;

  // Buscas de dados
  const rawAccounts = await prisma.bankAccount.findMany({ where: { workspaceId: currentWorkspaceId }, orderBy: { name: 'asc' } });
  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }));

  const rawCards = await prisma.creditCard.findMany({ where: { workspaceId: currentWorkspaceId }, orderBy: { name: 'asc' } });
  const cards = rawCards.map(card => ({ ...card, limit: Number(card.limit) }));

  // CORREÇÃO: Busca de categorias adicionada
  const categories = await prisma.category.findMany({ 
      where: { workspaceId: currentWorkspaceId }, 
      orderBy: { name: 'asc' } 
  });

  const notifications = await getNotifications();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex h-full z-30 shrink-0">
        <SidebarUI 
            user={user}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            tenantName={tenantName}
            role={role}
        />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-8 shrink-0">
           <MobileSidebar 
                user={user}
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                tenantName={tenantName}
                role={role}
           />

            <div className="flex-1 px-4 lg:px-0">
               <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                 <span>Econoplan</span>
                 <span className="text-border">/</span>
                 <span className="text-foreground font-medium">
                    {workspaces.find(w => w.id === currentWorkspaceId)?.name}
                 </span>
               </div>
            </div>

            <div className="flex items-center gap-4">
               <NotificationBell notifications={notifications} />
            </div>
        </header>

        {/* Área de Scroll do Conteúdo */}
        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 lg:p-8 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}