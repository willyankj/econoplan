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

  // SEGURANÇA: Garante que usuário E tenant existam (previne crash de dados órfãos)
  if (!user || !user.tenant) return { error: "Usuário ou organização não encontrados", user: null };

  // 1. Validação de Permissão por Cargo (RBAC)
  if (permissionKey && !checkPermission(user.role, user.tenant.settings, permissionKey)) {
    return { error: "Sem permissão para realizar esta ação.", user: null };
  }

  // 2. SEGURANÇA: Validação Financeira para Ações de Escrita (Defesa em Profundidade)
  // Impede que usuários com plano vencido manipulem dados via API, mesmo se burlarem o middleware.
  const isWriteAction = permissionKey && (
      permissionKey.includes('_create') || 
      permissionKey.includes('_edit') || 
      permissionKey.includes('_delete') ||
      permissionKey.includes('_pay')
  );

  if (isWriteAction) {
      const plan = user.tenant.planType || 'FREE';
      const status = user.tenant.subscriptionStatus;
      const nextPayment = user.tenant.nextPayment ? new Date(user.tenant.nextPayment) : null;
      const now = new Date();

      const isPlanValid = 
          plan === 'FREE' ||
          status === 'ACTIVE' || 
          status === 'TRIAL_PREMIUM' || 
          (status === 'CANCELED' && nextPayment && nextPayment > now);

      if (!isPlanValid) {
          return { error: "Sua assinatura expirou. Renove para continuar editando.", user: null };
      }
  }

  return { user, error: null };
}

export async function getActiveWorkspaceId(user: any) {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('activeWorkspaceId')?.value;
  
  // Segurança: Garante que o cookie aponta para um workspace que o usuário REALMENTE tem acesso
  const hasAccess = user.workspaces.some((w: any) => w.workspaceId === cookieId);
  
  // Retorna o do cookie se válido, senão o primeiro da lista (fallback seguro)
  return hasAccess && cookieId ? cookieId : user.workspaces[0]?.workspaceId;
}