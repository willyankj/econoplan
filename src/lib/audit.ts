import { prisma } from "@/lib/prisma";

interface AuditLogParams {
  tenantId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'ACTION';
  entity: string;
  entityId?: string;
  details?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    // Executa em "background" (não usamos await no retorno direto da action para não travar a UI)
    // Mas aqui no server-side o await garante que salve.
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? params.details.slice(0, 255) : null // Corta textos gigantes para economizar banco
      }
    });
  } catch (error) {
    console.error("Falha ao criar log de auditoria:", error);
    // Não lançamos erro para não impedir a ação principal do usuário
  }
}
