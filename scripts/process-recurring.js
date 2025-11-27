const path = require('path');
const jiti = require('jiti')(__filename, {
    cache: false,
    interopDefault: true,
    alias: { '@': path.join(__dirname, '../src') }
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log(`[RECURRING] Iniciando processamento: ${new Date().toISOString()}`);
    
    const today = new Date();

    // Busca transações recorrentes cuja "próxima data" já chegou (ou passou)
    const dues = await prisma.transaction.findMany({
        where: {
            isRecurring: true,
            nextRecurringDate: { lte: today }
        }
    });

    console.log(`[RECURRING] Encontradas ${dues.length} para processar.`);

    for (const tx of dues) {
        try {
            // 1. Cria a NOVA transação (Cópia)
            const newDate = new Date(today); // Cria na data de hoje (data da execução)
            
            await prisma.transaction.create({
                data: {
                    description: tx.description,
                    amount: tx.amount,
                    type: tx.type,
                    date: newDate,
                    workspaceId: tx.workspaceId,
                    bankAccountId: tx.bankAccountId,
                    creditCardId: tx.creditCardId,
                    categoryId: tx.categoryId,
                    isPaid: false, // Cria como pendente para o usuário confirmar/pagar
                    isRecurring: false, // A cópia não é recorrente, ela é o filho
                    frequency: 'NONE'
                }
            });

            // 2. Atualiza a data da próxima recorrência na transação "Mãe"
            const nextDate = new Date(tx.nextRecurringDate);
            nextDate.setMonth(nextDate.getMonth() + 1);

            await prisma.transaction.update({
                where: { id: tx.id },
                data: { nextRecurringDate: nextDate }
            });

            console.log(` > Processado: ${tx.description}`);
        } catch (e) {
            console.error(` > Erro em ${tx.id}:`, e);
        }
    }
}

main();
