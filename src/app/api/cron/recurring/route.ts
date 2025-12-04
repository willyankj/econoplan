import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { addMonths, addWeeks, addYears } from "date-fns";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[CRON RECURRING] Iniciando: ${new Date().toISOString()}`);
  const today = new Date();

  try {
    const dues = await prisma.transaction.findMany({
        where: {
            isRecurring: true,
            nextRecurringDate: { lte: today }
        },
        include: {
            workspace: true // Necessário para pegar o tenantId para auditoria
        }
    });

    let processed = 0;

    for (const tx of dues) {
        try {
            // ATOMICIDADE: Usamos transaction para garantir que não criamos duplicatas
            // caso a atualização da data falhe no meio do caminho.
            await prisma.$transaction(async (ptx) => {
                // 1. Cria a nova transação (Filha)
                const newTx = await ptx.transaction.create({
                    data: {
                        description: tx.description,
                        amount: tx.amount,
                        type: tx.type,
                        date: new Date(today), // Cria com a data de execução (hoje)
                        workspaceId: tx.workspaceId,
                        bankAccountId: tx.bankAccountId,
                        creditCardId: tx.creditCardId,
                        categoryId: tx.categoryId,
                        isPaid: false, // Recorrências nascem em aberto para confirmação
                        isRecurring: false, 
                        frequency: 'NONE'
                    }
                });

                // 2. Calcula a próxima data corretamente usando date-fns
                // (Evita o bug de pular meses como Jan 31 -> Mar 03)
                let nextDate = new Date(tx.nextRecurringDate!);
                if (tx.frequency === 'WEEKLY') nextDate = addWeeks(nextDate, 1);
                else if (tx.frequency === 'YEARLY') nextDate = addYears(nextDate, 1);
                else nextDate = addMonths(nextDate, 1); // Default MONTHLY

                // 3. Atualiza a transação original (Mãe)
                await ptx.transaction.update({
                    where: { id: tx.id },
                    data: { nextRecurringDate: nextDate }
                });

                // 4. Auditoria REMOVIDA temporariamente
                // Motivo: userId 'system-cron' viola FK de User se não existir um usuário real com esse ID.
                // TODO: Criar usuário de sistema ou tornar userId opcional em AuditLog.
                // console.log(`[CRON] Recorrência gerada: ${newTx.id}`);
            });

            processed++;
        } catch (err) {
            console.error(`Erro ao processar transação ${tx.id}:`, err);
            // Não damos throw aqui para não travar a fila inteira se um falhar
        }
    }

    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error("[CRON RECURRING] Erro Fatal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}