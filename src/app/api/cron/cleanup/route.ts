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

    try {
        // 1. Limpar Logs Antigos
        const deletedAudit = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditLimit } } });
        const deletedNotif = await prisma.notification.deleteMany({ where: { createdAt: { lt: notifLimit }, read: true } });

        // 2. Limpar Workspaces Deletados (Soft Delete)
        // Nota: Isso requer que você tenha adicionado o campo deletedAt no schema, se ainda não usou, pode comentar.
        const deletedWorkspaces = await prisma.workspace.deleteMany({ where: { deletedAt: { lt: trashLimit } } });

        // 3. Limpar Tenants Inativos e Abandonados (Sem pagamento nunca)
        const deletedTenants = await prisma.tenant.deleteMany({
            where: {
                subscriptionStatus: "INACTIVE",
                createdAt: { lt: trashLimit },
                mercadoPagoId: null, 
                OR: [
                    { nextPayment: null },
                    { nextPayment: { lt: trashLimit } }
                ]
            }
        });

        return NextResponse.json({ 
            success: true, 
            cleaned: {
                auditLogs: deletedAudit.count,
                notifications: deletedNotif.count,
                workspaces: deletedWorkspaces.count,
                tenants: deletedTenants.count
            }
        });

    } catch (error: any) {
        console.error("[CRON CLEANUP] Erro:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
