'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { notifyBudgetExceeded, notifyBudgetWarning } from "@/lib/notifications";
import { createHash } from "crypto";
import { addDays, differenceInDays, addMonths } from "date-fns"; // <--- AQUI ESTAVA O PROBLEMA (IMPORT CORRIGIDO)

// --- UTILITÁRIO DE HASH SERVER-SIDE ---
function generateTransactionHash(date: Date, amount: number, description: string): string {
    const str = `${date.toISOString().split('T')[0]}|${amount.toFixed(2)}|${description.trim().toLowerCase()}`;
    return createHash('md5').update(str).digest('hex');
}

// --- SCHEMAS ---
const AccountSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  bank: z.string().min(1, "Banco obrigatório"),
  balance: z.coerce.number({ message: "Saldo inválido" }),
});

const CardSchema = z.object({
  name: z.string().min(1, "Apelido obrigatório"),
  bank: z.string().min(1, "Banco obrigatório"),
  limit: z.coerce.number().positive("Limite inválido"),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
});

const TransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  recurrence: z.string().optional(),
  installments: z.coerce.number().optional(),
});

const PayInvoiceSchema = z.object({
  cardId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  date: z.string(),
});

// --- ACTIONS ---

export async function upsertAccount(formData: FormData, id?: string) {
  const permission = id ? 'accounts_edit' : 'accounts_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const parsed = AccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  const data = parsed.data;

  try {
    if (id) {
      await prisma.bankAccount.update({ where: { id }, data });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Account', entityId: id, details: `Editou conta ${data.name}` });
    } else {
      const workspaceId = await getActiveWorkspaceId(user);
      if(!workspaceId) return { error: "Sem workspace" };
      const acc = await prisma.bankAccount.create({ data: { ...data, workspaceId, isIncluded: true } });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Account', entityId: acc.id, details: `Criou conta ${data.name}` });
    }
  } catch (e) { return { error: "Erro ao salvar conta." }; }
  
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { user, error } = await validateUser('accounts_delete');
  if (error || !user) return { error };
  try {
    const acc = await prisma.bankAccount.findUnique({ where: { id } });
    await prisma.bankAccount.delete({ where: { id } });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Account', details: `Apagou conta ${acc?.name}` });
  } catch (e) { return { error: "Erro ao excluir." }; }
  revalidatePath('/dashboard');
  return { success: true };
}

export async function upsertCard(formData: FormData, id?: string) {
  const permission = id ? 'cards_edit' : 'cards_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const parsed = CardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  const data = parsed.data;

  try {
    if (id) {
      await prisma.creditCard.update({ where: { id }, data });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Card', entityId: id, details: `Atualizou cartão ${data.name}` });
    } else {
      const workspaceId = await getActiveWorkspaceId(user);
      if(!workspaceId) return { error: "Sem workspace" };
      const card = await prisma.creditCard.create({ data: { ...data, workspaceId } });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Card', entityId: card.id, details: `Criou cartão ${data.name}` });
    }
  } catch (e) { return { error: "Erro ao salvar cartão." }; }
  
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCreditCard(id: string) {
  const { user, error } = await validateUser('cards_delete');
  if (error || !user) return { error };
  try {
    const card = await prisma.creditCard.findUnique({ where: { id } });
    await prisma.creditCard.delete({ where: { id } });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Card', details: `Apagou cartão ${card?.name}` });
  } catch (e) { return { error: "Erro ao excluir." }; }
  revalidatePath('/dashboard');
  return { success: true };
}

export async function payCreditCardInvoice(formData: FormData) {
  const { user, error } = await validateUser('cards_pay');
  if (error || !user) return { error };

  const parsed = PayInvoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  
  const { cardId, accountId, amount, date: dateStr } = parsed.data;
  const date = new Date(dateStr + "T12:00:00");

  const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
  if(!card) return { error: "Cartão inválido" };

  try {
      const category = await prisma.category.upsert({ 
          where: { workspaceId_name_type: { workspaceId: card.workspaceId, name: "Pagamento de Fatura", type: "EXPENSE" } }, 
          update: {}, create: { name: "Pagamento de Fatura", type: "EXPENSE", workspaceId: card.workspaceId } 
      });

      await prisma.$transaction([
          prisma.transaction.create({ data: { description: `Fatura - ${card.name}`, amount, type: "EXPENSE", date, workspaceId: card.workspaceId, bankAccountId: accountId, categoryId: category.id, isPaid: true } }),
          prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
          prisma.transaction.updateMany({ where: { creditCardId: cardId, isPaid: false, date: { lte: date } }, data: { isPaid: true } })
      ]);

      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Card', details: `Pagou fatura ${card.name}` });
  } catch (e) { return { error: "Erro no pagamento." }; }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function upsertTransaction(formData: FormData, id?: string) {
  const permission = id ? 'transactions_edit' : 'transactions_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };

  const { description, amount, type, date: dateStr, category: categoryName, accountId, cardId, recurrence, installments, paymentMethod } = parsed.data;
  const baseDate = new Date(dateStr + "T12:00:00");
  let workspaceId = "";

  if (id) {
      const oldT = await prisma.transaction.findUnique({ where: { id } });
      if (!oldT) return { error: "Transação não encontrada" };
      workspaceId = oldT.workspaceId;
  } else {
      workspaceId = await getActiveWorkspaceId(user);
  }
  if (!workspaceId) return { error: "Workspace inválido" };

  let catId = parsed.data.categoryId;
  if (!catId && categoryName) {
      const cat = await prisma.category.upsert({
          where: { workspaceId_name_type: { workspaceId, name: categoryName, type } },
          update: {}, create: { name: categoryName, type, workspaceId }
      });
      catId = cat.id;
  }
  if (!catId) return { error: "Categoria inválida" };

  if (id) {
      await prisma.transaction.update({ where: { id }, data: { description, amount, date: baseDate, categoryId: catId } });
      return { success: true };
  }

  const isInstallment = recurrence === 'INSTALLMENT' && (installments || 0) > 1;
  const isRecurring = ['MONTHLY', 'WEEKLY', 'YEARLY'].includes(recurrence || '');

  try {
      await prisma.$transaction(async (tx) => {
          if (isInstallment && cardId) {
              const installmentGroupId = uuidv4();
              const totalInstallments = installments || 1;
              const installmentValue = amount; 

              for (let i = 0; i < totalInstallments; i++) {
                  const installmentDate = new Date(baseDate);
                  installmentDate.setMonth(baseDate.getMonth() + i);

                  await tx.transaction.create({
                      data: {
                          description: `${description} (${i + 1}/${totalInstallments})`,
                          amount: installmentValue, type, date: installmentDate, workspaceId, creditCardId: cardId, categoryId: catId, isPaid: false,
                          isInstallment: true, installmentId: installmentGroupId, installmentCurrent: i + 1, installmentTotal: totalInstallments, frequency: 'MONTHLY'
                      }
                  });
              }
              await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `Parcelamento ${description} ${totalInstallments}x` });
          } else if (isRecurring) {
              const nextDate = new Date(baseDate);
              if (recurrence === 'WEEKLY') nextDate.setDate(baseDate.getDate() + 7);
              else if (recurrence === 'YEARLY') nextDate.setFullYear(baseDate.getFullYear() + 1);
              else nextDate.setMonth(baseDate.getMonth() + 1);
              
              await tx.transaction.create({
                  data: {
                      description, amount, type, date: baseDate, workspaceId,
                      bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
                      creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
                      categoryId: catId, isPaid: paymentMethod === 'ACCOUNT',
                      isRecurring: true, nextRecurringDate: nextDate, frequency: recurrence as any
                  }
              });
              if (paymentMethod === 'ACCOUNT' && accountId) {
                 const op = type === 'INCOME' ? 'increment' : 'decrement';
                 await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: amount } } });
              }
          } else {
              await tx.transaction.create({
                  data: {
                      description, amount, type, date: baseDate, workspaceId,
                      bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
                      creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
                      categoryId: catId, isPaid: paymentMethod === 'ACCOUNT', isRecurring: false, frequency: 'NONE'
                  }
              });
               if (paymentMethod === 'ACCOUNT' && accountId) {
                  const op = type === 'INCOME' ? 'increment' : 'decrement';
                  await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: amount } } });
               }
          }
      });
  } catch (e) { return { error: "Erro ao criar transação." }; }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const { user, error } = await validateUser('transactions_delete');
  if (error || !user) return { error };

  const t = await prisma.transaction.findUnique({ where: { id } });
  if (!t) return { error: "Não encontrado" };

  try {
    if (t.isPaid && t.bankAccountId) {
        const op = t.type === 'INCOME' ? 'decrement' : 'increment';
        await prisma.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { [op]: t.amount } } });
    }

    // DELETE EM CASCATA PARA PARCELAMENTOS
    if (t.isInstallment && t.installmentId) {
        await prisma.transaction.deleteMany({ where: { workspaceId: t.workspaceId, installmentId: t.installmentId } });
        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Transaction', details: `Apagou compra parcelada: ${t.description}` });
    } else {
        await prisma.transaction.delete({ where: { id } });
        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Transaction', details: `Apagou: ${t.description}` });
    }
  } catch(e) { return { error: "Erro ao apagar transação." }; }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function importTransactions(accountId: string, transactions: any[]) {
    const { user, error } = await validateUser('transactions_create');
    if (error || !user) return { error };

    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };

    let count = 0;
    let skipped = 0;

    try {
        await prisma.$transaction(async (tx) => {
            for (const t of transactions) {
                if (!t.date || isNaN(Number(t.amount)) || !t.description) continue;

                const date = new Date(t.date);
                const transactionType = t.amount >= 0 ? 'INCOME' : 'EXPENSE';
                const absAmount = Math.abs(Number(t.amount));
                
                const externalId = t.externalId || null;
                const importHash = t.externalId ? null : generateTransactionHash(date, absAmount, t.description);

                const existing = await tx.transaction.findFirst({
                    where: {
                        workspaceId: account.workspaceId,
                        OR: [
                            ...(externalId ? [{ externalId }] : []),
                            ...(importHash ? [{ importHash }] : [])
                        ]
                    }
                });

                if (existing) {
                    skipped++;
                    continue;
                }
                
                let finalCategoryId = t.categoryId; 
                if (!finalCategoryId) {
                    const categoryName = t.categoryName || "Importados";
                    const cat = await tx.category.upsert({
                        where: { workspaceId_name_type: { workspaceId: account.workspaceId, name: categoryName, type: transactionType } },
                        update: {}, create: { name: categoryName, type: transactionType, workspaceId: account.workspaceId }
                    });
                    finalCategoryId = cat.id;
                }

                await tx.transaction.create({
                    data: { 
                        description: t.description, amount: absAmount, type: transactionType, date, 
                        workspaceId: account.workspaceId, bankAccountId: accountId, categoryId: finalCategoryId, isPaid: true,
                        externalId, importHash 
                    }
                });

                const op = transactionType === 'INCOME' ? 'increment' : 'decrement';
                await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: absAmount } } });
                count++;
            }
        });
        
        if (count > 0) {
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `Importou ${count} (Pulou ${skipped})` });
        } else if (skipped > 0) {
            return { error: `Nada importado. ${skipped} itens já existiam.` };
        }

    } catch(e) { return { error: "Erro na importação" }; }

    revalidatePath('/dashboard/transactions'); 
    revalidatePath('/dashboard/accounts');
    revalidatePath('/dashboard');
    return { success: true };
}

export async function stopTransactionRecurrence(id: string) {
  const { user, error } = await validateUser('transactions_edit');
  if (error || !user) return { error };

  try {
    await prisma.transaction.update({ where: { id }, data: { isRecurring: false, nextRecurringDate: null } });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Transaction', entityId: id, details: 'Encerrou recorrência' });
  } catch (e) { return { error: "Erro ao cancelar." }; }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getRecurringTransactions() {
  const { user, error } = await validateUser();
  if (error || !user) return [];
  const workspaceId = await getActiveWorkspaceId(user);
  if (!workspaceId) return [];

  const recurrings = await prisma.transaction.findMany({
    where: { workspaceId, isRecurring: true, nextRecurringDate: { not: null } },
    orderBy: { nextRecurringDate: 'asc' },
    include: { category: true }
  });

  return recurrings.map(t => ({
      ...t, amount: Number(t.amount), date: t.date.toISOString(),
      nextRecurringDate: t.nextRecurringDate?.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString()
  }));
}

// --- NOVA FUNÇÃO: PRÓXIMOS VENCIMENTOS ---
export async function getUpcomingBills() {
  const { user, error } = await validateUser();
  if (error || !user) return [];
  const workspaceId = await getActiveWorkspaceId(user);
  if (!workspaceId) return [];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limitDate = addDays(today, 30); 

  const bills = await prisma.transaction.findMany({
    where: { workspaceId, type: 'EXPENSE', isPaid: false, creditCardId: null, date: { lte: limitDate } },
    orderBy: { date: 'asc' }, take: 10, include: { category: true }
  });

  const cards = await prisma.creditCard.findMany({
    where: { workspaceId },
    include: { transactions: { where: { isPaid: false, type: 'EXPENSE' } } }
  });

  const cardBills = cards.map(card => {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    let dueDate = new Date(currentYear, currentMonth, card.dueDay);
    
    // IMPORTANTE: Usa differenceInDays para calcular se a fatura já virou
    if (differenceInDays(today, dueDate) > 20) { dueDate = addMonths(dueDate, 1); }
    
    const total = card.transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    
    return {
      id: card.id, description: `Fatura ${card.name}`, amount: total, date: dueDate, isCard: true, bank: card.bank,
      category: { name: 'Cartão de Crédito', icon: 'CreditCard', color: '#64748b' }
    };
  }).filter(c => c.amount > 0 && c.date <= limitDate);

  const allBills = [
    ...bills.map(b => ({
      id: b.id, description: b.description, amount: Number(b.amount), date: b.date,
      category: b.category ? { name: b.category.name, icon: b.category.icon || undefined, color: b.category.color || undefined } : undefined,
      isCard: false, bank: undefined 
    })),
    ...cardBills
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return allBills.map(b => ({ ...b, date: b.date.toISOString() }));
}