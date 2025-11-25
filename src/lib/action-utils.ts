import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
import { cookies } from 'next/headers';

export async function validateUser(permissionKey?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado", user: null };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true, workspaces: true }
  });

  if (!user) return { error: "Usuário não encontrado", user: null };

  if (permissionKey && !checkPermission(user.role, user.tenant.settings, permissionKey)) {
    return { error: "Sem permissão para realizar esta ação.", user: null };
  }

  return { user, error: null };
}

export async function getActiveWorkspaceId(user: any) {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('activeWorkspaceId')?.value;
  
  const hasAccess = user.workspaces.some((w: any) => w.workspaceId === cookieId);
  return hasAccess && cookieId ? cookieId : user.workspaces[0]?.workspaceId;
}