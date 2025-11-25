const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log(`[CLEANUP] Iniciando limpeza segura: ${new Date().toISOString()}`);

    // Data limite: 30 dias atrás
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30);

    try {
        // 1. Limpeza de Workspaces (Soft Deleted > 30 dias)
        const trashWorkspaces = await prisma.workspace.findMany({
            where: {
                deletedAt: { lt: limitDate } // Excluídos antes de 30 dias atrás
            },
            select: { id: true, name: true }
        });

        if (trashWorkspaces.length > 0) {
            console.log(`[CLEANUP] Apagando ${trashWorkspaces.length} workspaces da lixeira...`);
            for (const ws of trashWorkspaces) {
                console.log(` - Removendo permanentemente: ${ws.name}`);
                await prisma.workspace.delete({ where: { id: ws.id } });
            }
        }

        // 2. Limpeza de Tenants Inativos (Opcional: Também pode usar Soft Delete no Tenant)
        // Se mantiver a lógica original de inativos sem pagamento, adicione proteção extra:
        const inactiveTenants = await prisma.tenant.findMany({
            where: {
                subscriptionStatus: "INACTIVE",
                createdAt: { lt: limitDate },
                // Proteção: Só apaga se NÃO tiver MP ID vinculado (nunca pagou)
                mercadoPagoId: null, 
                OR: [
                    { nextPayment: null },
                    { nextPayment: { lt: limitDate } }
                ]
            },
            select: { id: true, name: true }
        });

        if (inactiveTenants.length > 0) {
            console.log(`[CLEANUP] Apagando ${inactiveTenants.length} tenants abandonados (sem pagamento)...`);
            for (const tenant of inactiveTenants) {
                console.log(` - Removendo permanentemente: ${tenant.name}`);
                await prisma.tenant.delete({ where: { id: tenant.id } });
            }
        }

        console.log("[CLEANUP] Concluído.");

    } catch (error) {
        console.error("[CLEANUP] Erro fatal:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();