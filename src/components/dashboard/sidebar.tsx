import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { SidebarUI } from './sidebar-ui'; // Importa o visual

export async function Sidebar() {
  const session = await getServerSession(authOptions);
  
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email || '' },
    include: { 
        tenant: true,
        workspaces: { include: { workspace: true } }
    }
  });

  const tenantName = user?.tenant.name || "Minha Organização";
  const role = user?.role === 'OWNER' ? 'Proprietário' : 'Membro';
  
  const workspaces = user?.workspaces.map(wm => ({
    id: wm.workspace.id,
    name: wm.workspace.name
  })) || [];

  // --- CORREÇÃO AQUI: await cookies() ---
  const cookieStore = await cookies();
  const activeWorkspaceCookie = cookieStore.get('activeWorkspaceId')?.value;
  
  const activeWorkspaceId = activeWorkspaceCookie || workspaces[0]?.id;

  // Renderiza a versão Desktop (escondida no mobile)
  return (
    <div className="hidden lg:flex flex-col w-72 fixed h-full z-30">
      <SidebarUI 
        user={user}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        tenantName={tenantName}
        role={role}
      />
    </div>
  );
}