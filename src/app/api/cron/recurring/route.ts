import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

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
        }
    });

    let processed = 0;

    for (const tx of dues) {
        try {
            // 1. Copia a transação
            await prisma.transaction.create({
                data: {
                    description: tx.description,
                    amount: tx.amount,
                    type: tx.type,
                    date: new Date(today),
                    workspaceId: tx.workspaceId,
                    bankAccountId: tx.bankAccountId,
                    creditCardId: tx.creditCardId,
                    categoryId: tx.categoryId,
                    isPaid: false, 
                    isRecurring: false, 
                    frequency: 'NONE'
                }
            });

            // 2. Atualiza a data da próxima
            if (tx.nextRecurringDate) {
                const nextDate = new Date(tx.nextRecurringDate);
                if (tx.frequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
                else if (tx.frequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else nextDate.setMonth(nextDate.getMonth() + 1);

                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { nextRecurringDate: nextDate }
                });
            }
            processed++;
        } catch (err) {
            console.error(`Erro ao processar transação ${tx.id}:`, err);
        }
    }

    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error("[CRON RECURRING] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}