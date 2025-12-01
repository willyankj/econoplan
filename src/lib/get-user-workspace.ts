import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';

export async function getUserWorkspace() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Busca o usuário e seus workspaces
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: true }
  });

  if (!user || user.workspaces.length === 0) {
    // Se não tiver workspace, tenta achar um que ele seja dono pelo TenantId como fallback de segurança
    const fallbackWorkspace = await prisma.workspace.findFirst({
        where: { tenantId: user?.tenantId }
    });
    
    if (fallbackWorkspace) {
        // Auto-correção: Se ele é dono do tenant mas não estava membro, adiciona agora
        await prisma.workspaceMember.create({
            data: { userId: user!.id, workspaceId: fallbackWorkspace.id, role: 'ADMIN' }
        });
        return { user, workspaceId: fallbackWorkspace.id };
    }

    return { user, workspaceId: "", error: "Sem workspace" };
  }

  const cookieStore = await cookies();
  const activeWorkspaceCookie = cookieStore.get('activeWorkspaceId')?.value;
  
  let workspaceId = user.workspaces[0].workspaceId;
  
  if (activeWorkspaceCookie) {
    const hasAccess = user.workspaces.find(w => w.workspaceId === activeWorkspaceCookie);
    if (hasAccess) {
      workspaceId = activeWorkspaceCookie;
    }
  }

  return { user, workspaceId };
}