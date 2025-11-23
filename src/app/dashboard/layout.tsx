import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';

import { SidebarUI } from '@/components/dashboard/sidebar-ui';
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar';
import { NewTransactionModal } from '@/components/dashboard/new-transaction-modal';
import { NotificationBell } from "@/components/dashboard/notifications/notification-bell"; // <--- NOVO
import { getNotifications } from "@/app/dashboard/actions"; // <--- NOVO

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

  // BUSCA NOTIFICAÇÕES
  const notifications = await getNotifications();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden">
      
      <aside className="hidden lg:flex w-72 flex-col fixed h-full z-30 border-r border-border">
        <SidebarUI 
            user={user}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            tenantName={tenantName}
            role={role}
        />
      </aside>

      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8">
           
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
               {/* AQUI ENTRA O SINO INTELIGENTE */}
               <NotificationBell notifications={notifications} />
               
               <NewTransactionModal accounts={accounts} cards={cards} />
            </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  );
}