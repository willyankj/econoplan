import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[CRON CLEANUP] Iniciando limpeza: ${new Date().toISOString()}`);

    // Datas limites
    const auditLimit = new Date(); auditLimit.setMonth(auditLimit.getMonth() - 6);
    const notifLimit = new Date(); notifLimit.setMonth(notifLimit.getMonth() - 3);
    const trashLimit = new Date(); trashLimit.setDate(trashLimit.getDate() - 30);
    
    // Limite de inatividade (ex: 90 dias sem login) para considerar abandono
    const inactivityLimit = new Date(); inactivityLimit.setDate(inactivityLimit.getDate() - 90);

    try {
        // 1. Limpar Logs Antigos
        const deletedAudit = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditLimit } } });
        const deletedNotif = await prisma.notification.deleteMany({ where: { createdAt: { lt: notifLimit }, read: true } });

        // 2. Limpar Workspaces Deletados (Soft Delete)
        // Certifique-se que seu schema tem o campo deletedAt
        const deletedWorkspaces = await prisma.workspace.deleteMany({ where: { deletedAt: { lt: trashLimit } } });

        // 3. Limpar Tenants ABANDONADOS
        // Critérios rígidos para não apagar usuários ativos do plano Free:
        // - Status INACTIVE
        // - Sem ID de pagamento (nunca virou Premium)
        // - Criado há mais de 30 dias
        // - E PRINCIPAL: Nenhum usuário desse tenant fez login nos últimos 90 dias
        
        // Primeiro, identificamos os tenants candidatos
        const tenantsToDelete = await prisma.tenant.findMany({
            where: {
                subscriptionStatus: "INACTIVE",
                createdAt: { lt: trashLimit },
                mercadoPagoId: null,
                users: {
                    every: {
                        lastLogin: { lt: inactivityLimit } // Todos os usuários não logaram recentemente
                    }
                }
            },
            select: { id: true }
        });

        const tenantIds = tenantsToDelete.map(t => t.id);

        let deletedTenantsCount = 0;
        if (tenantIds.length > 0) {
            // Deleção em cascata manual (se não estiver configurado no schema)
            // Geralmente deletar o Tenant cascateia, mas por segurança limpamos dependências
            await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
            const deleteResult = await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
            deletedTenantsCount = deleteResult.count;
        }

        return NextResponse.json({ 
            success: true, 
            cleaned: {
                auditLogs: deletedAudit.count,
                notifications: deletedNotif.count,
                workspaces: deletedWorkspaces.count,
                tenants: deletedTenantsCount
            }
        });

    } catch (error: any) {
        console.error("[CRON CLEANUP] Erro:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}