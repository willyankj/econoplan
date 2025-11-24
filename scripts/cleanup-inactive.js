// scripts/cleanup-inactive.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log(`[CLEANUP] Iniciando limpeza de contas inativas: ${new Date().toISOString()}`);

    // Data limite: Hoje menos 15 dias
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 15);

    try {
        // Busca tenants (organizações) que:
        // 1. Estão com status INACTIVE
        // 2. Foram criados há mais de 15 dias
        // 3. Nunca pagaram (nextPayment null) OU o vencimento já passou há mais de 15 dias
        const inactiveTenants = await prisma.tenant.findMany({
            where: {
                subscriptionStatus: "INACTIVE",
                createdAt: { lt: limitDate },
                OR: [
                    { nextPayment: null },
                    { nextPayment: { lt: limitDate } }
                ]
            },
            select: { id: true, name: true }
        });

        if (inactiveTenants.length === 0) {
            console.log("[CLEANUP] Nenhuma conta inativa encontrada para exclusão.");
            return;
        }

        console.log(`[CLEANUP] Encontrados ${inactiveTenants.length} tenants para exclusão.`);

        for (const tenant of inactiveTenants) {
            console.log(` - Excluindo: ${tenant.name} (ID: ${tenant.id})`);
            
            // O 'Cascade' configurado no Schema do Prisma vai apagar:
            // Workspaces, Usuários, Transações, Contas, etc.
            await prisma.tenant.delete({
                where: { id: tenant.id }
            });
        }

        console.log("[CLEANUP] Limpeza concluída com sucesso.");

    } catch (error) {
        console.error("[CLEANUP] Erro fatal durante a execução:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();