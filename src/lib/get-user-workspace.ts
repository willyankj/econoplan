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

  // SEGURANÇA: Se o usuário não existe no banco (sessão órfã), força logout/login
  if (!user) {
      redirect("/login");
  }

  // Se não tiver workspace vinculado
  if (user.workspaces.length === 0) {
    // Tenta achar um que ele seja dono pelo TenantId como fallback de segurança
    const fallbackWorkspace = await prisma.workspace.findFirst({
        where: { tenantId: user.tenantId }
    });
    
    if (fallbackWorkspace) {
        // Auto-correção: Se ele é dono do tenant mas não estava membro, adiciona agora
        await prisma.workspaceMember.create({
            data: { userId: user.id, workspaceId: fallbackWorkspace.id, role: 'ADMIN' }
        });
        return { user, workspaceId: fallbackWorkspace.id };
    }

    return { user, workspaceId: "", error: "Sem workspace" };
  }

  const cookieStore = await cookies();
  const activeWorkspaceCookie = cookieStore.get('activeWorkspaceId')?.value;
  
  // Padrão: pega o primeiro (idealmente ordenar por data de criação se quiser consistência)
  let workspaceId = user.workspaces[0].workspaceId;
  
  // Se tiver cookie e o usuário ainda tiver acesso a esse workspace, usa ele
  if (activeWorkspaceCookie) {
    const hasAccess = user.workspaces.find(w => w.workspaceId === activeWorkspaceCookie);
    if (hasAccess) {
      workspaceId = activeWorkspaceCookie;
    }
  }

  return { user, workspaceId };
}