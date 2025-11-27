const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log(`[LOG CLEANUP] Iniciando limpeza de logs antigos: ${new Date().toISOString()}`);

    // Regra: Manter auditoria por 6 meses e notificações por 3 meses
    const auditLimit = new Date();
    auditLimit.setMonth(auditLimit.getMonth() - 6);

    const notifLimit = new Date();
    notifLimit.setMonth(notifLimit.getMonth() - 3);

    try {
        // 1. Limpar AuditLog
        const deletedAudit = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: auditLimit } }
        });
        console.log(`[LOG CLEANUP] ${deletedAudit.count} logs de auditoria antigos removidos.`);

        // 2. Limpar Notificações (Apenas lidas ou todas antigas)
        const deletedNotif = await prisma.notification.deleteMany({
            where: { 
                createdAt: { lt: notifLimit },
                read: true // Opcional: apagar só as lidas
            }
        });
        console.log(`[LOG CLEANUP] ${deletedNotif.count} notificações antigas removidas.`);

    } catch (error) {
        console.error("[LOG CLEANUP] Erro:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
