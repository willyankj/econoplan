'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { createHash } from "crypto";
import { addDays, differenceInDays, addMonths, isBefore, isAfter } from "date-fns";

// --- UTILITÁRIO DE HASH ---
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
  bank: z.string().optional(), 
  limit: z.coerce.number().positive("Limite inválido"),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
  linkedAccountId: z.string().optional()
});

const TransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  date: z.string(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  accountId: z.string().optional(),
  destinationAccountId: z.string().optional(),
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
  
  const { name, limit, closingDay, dueDay, linkedAccountId } = parsed.data;
  let { bank } = parsed.data;

  if (linkedAccountId && linkedAccountId !== "none") {
      const linkedAccount = await prisma.bankAccount.findUnique({ where: { id: linkedAccountId } });
      if (linkedAccount) bank = linkedAccount.bank;
  }

  if (!bank) {
      if (id) {
          const oldCard = await prisma.creditCard.findUnique({ where: { id } });
          bank = oldCard?.bank;
      }
      if (!bank) return { error: "Informe o banco ou vincule uma conta." };
  }

  const data = {
      name,
      bank: bank!,
      limit,
      closingDay,
      dueDay,
      linkedAccountId: linkedAccountId === "none" ? null : linkedAccountId
  };

  try {
    if (id) {
      await prisma.creditCard.update({ where: { id }, data });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Card', entityId: id, details: `Atualizou cartão ${data.name}` });
    } else {
      const workspaceId = await getActiveWorkspaceId(user);
      if(!workspaceId) return { error: "Sem workspace" };
      await prisma.creditCard.create({ data: { ...data, workspaceId } });
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
      // 1. Calcular o total real pendente até a data informada para validação de segurança
      const pendingTransactions = await prisma.transaction.aggregate({
          where: { creditCardId: cardId, isPaid: false, date: { lte: date } },
          _sum: { amount: true }
      });
      
      const totalPending = Number(pendingTransactions._sum.amount || 0);
      
      // Permitimos uma margem de erro pequena (ex: 0.50) para arredondamentos, 
      // mas impedimos pagar 1 real para quitar 5000.
      if (Math.abs(totalPending - amount) > 1.0) {
           return { error: `O valor do pagamento (R$ ${amount}) diverge do total da fatura (R$ ${totalPending}).` };
      }

      const category = await prisma.category.upsert({ 
          where: { workspaceId_name_type: { workspaceId: card.workspaceId, name: "Pagamento de Fatura", type: "EXPENSE" } }, 
          update: {}, create: { name: "Pagamento de Fatura", type: "EXPENSE", workspaceId: card.workspaceId } 
      });

      await prisma.$transaction([
          prisma.transaction.create({ data: { description: `Fatura - ${card.name}`, amount, type: "EXPENSE", date, workspaceId: card.workspaceId, bankAccountId: accountId, categoryId: category.id, isPaid: true } }),
          prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
          // Segurança: Só marca como pago as transações que validamos acima
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

  const { description, amount, type, date: dateStr, category: categoryName, accountId, destinationAccountId, cardId, recurrence, installments, paymentMethod } = parsed.data;
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

  // --- LÓGICA DE TRANSFERÊNCIA ---
  if (type === 'TRANSFER') {
      if (!accountId || !destinationAccountId) return { error: "Selecione as duas contas." };
      if (accountId === destinationAccountId) return { error: "Contas devem ser diferentes." };

      try {
          await prisma.$transaction(async (tx) => {
              await tx.transaction.create({
                  data: {
                      description: `Transferência para: ${description || 'Conta Destino'}`,
                      amount, type: 'EXPENSE', date: baseDate, workspaceId, bankAccountId: accountId, isPaid: true,
                      category: { connectOrCreate: { where: { workspaceId_name_type: { workspaceId, name: "Transferência Enviada", type: "EXPENSE" } }, create: { name: "Transferência Enviada", type: "EXPENSE", workspaceId, icon: "ArrowRightLeft", color: "#3b82f6" } } }
                  }
              });
              await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });

              await tx.transaction.create({
                  data: {
                      description: `Recebido de: ${description || 'Conta Origem'}`,
                      amount, type: 'INCOME', date: baseDate, workspaceId, bankAccountId: destinationAccountId, isPaid: true,
                      category: { connectOrCreate: { where: { workspaceId_name_type: { workspaceId, name: "Transferência Recebida", type: "INCOME" } }, create: { name: "Transferência Recebida", type: "INCOME", workspaceId, icon: "ArrowRightLeft", color: "#3b82f6" } } }
                  }
              });
              await tx.bankAccount.update({ where: { id: destinationAccountId }, data: { balance: { increment: amount } } });
          });
          revalidatePath('/dashboard');
          return { success: true };
      } catch (e) { return { error: "Erro na transferência." }; }
  }

  // --- RESOLUÇÃO DE CATEGORIA ---
  let catId = parsed.data.categoryId;
  if (!catId && categoryName) {
      const cat = await prisma.category.upsert({
          where: { workspaceId_name_type: { workspaceId, name: categoryName, type: type as any } },
          update: {}, create: { name: categoryName, type: type as any, workspaceId }
      });
      catId = cat.id;
  }
  if (!catId) {
      const cat = await prisma.category.upsert({
          where: { workspaceId_name_type: { workspaceId, name: "Geral", type: type as any } },
          update: {}, create: { name: "Geral", type: type as any, workspaceId }
      });
      catId = cat.id;
  }

  // --- CORREÇÃO 1: EDIÇÃO DE TRANSAÇÃO (ATUALIZAR SALDO) ---
  if (id) {
      try {
          await prisma.$transaction(async (tx) => {
              const oldT = await tx.transaction.findUnique({ where: { id } });
              if (!oldT) throw new Error("Transação original não encontrada");

              // Atualiza a transação
              await tx.transaction.update({ 
                  where: { id }, 
                  data: { description, amount, date: baseDate, categoryId: catId } 
              });

              // Se a transação já estava paga e vinculada a uma conta, precisamos corrigir o saldo
              if (oldT.isPaid && oldT.bankAccountId) {
                  const diff = amount - Number(oldT.amount);
                  
                  if (diff !== 0) {
                      // Se for RECEITA: Aumentou o valor -> Aumenta saldo (increment diff)
                      // Se for DESPESA: Aumentou o valor -> Diminui saldo (decrement diff)
                      // O Prisma suporta 'increment' com números negativos, mas vamos ser explícitos.
                      if (oldT.type === 'INCOME') {
                          await tx.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { increment: diff } } });
                      } else if (oldT.type === 'EXPENSE') {
                          await tx.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { decrement: diff } } });
                      }
                  }
              }
          });
          return { success: true };
      } catch (e) {
          return { error: "Erro ao atualizar transação." };
      }
  }

  const isInstallment = recurrence === 'INSTALLMENT' && (installments || 0) > 1;
  const isRecurring = ['MONTHLY', 'WEEKLY', 'YEARLY'].includes(recurrence || '');

  try {
      await prisma.$transaction(async (tx) => {
          
          let goalIdToLink = null;
          if (paymentMethod === 'ACCOUNT' && accountId) {
              const linkedGoal = await tx.goal.findFirst({ where: { linkedAccountId: accountId } });
              if (linkedGoal) {
                  goalIdToLink = linkedGoal.id;
                  const op = type === 'INCOME' ? 'increment' : 'decrement';
                  await tx.goal.update({ where: { id: linkedGoal.id }, data: { currentAmount: { [op]: amount } } });
              }
          }

          if (isInstallment && cardId) {
              const installmentGroupId = uuidv4();
              const totalInstallments = installments || 1;
              
              // --- CORREÇÃO 2: ARREDONDAMENTO DE PARCELAS ---
              // Ex: 100 reais em 3x. 33.33, 33.33, 33.34.
              const rawInstallmentValue = Math.floor((amount / totalInstallments) * 100) / 100;
              const firstInstallmentValue = Number((amount - (rawInstallmentValue * (totalInstallments - 1))).toFixed(2));

              for (let i = 0; i < totalInstallments; i++) {
                  const installmentDate = addMonths(baseDate, i);
                  // A primeira parcela absorve a diferença de centavos
                  const currentAmount = i === 0 ? firstInstallmentValue : rawInstallmentValue;

                  await tx.transaction.create({
                      data: {
                          description: `${description} (${i + 1}/${totalInstallments})`,
                          amount: currentAmount, 
                          type: type as any, 
                          date: installmentDate, 
                          workspaceId, 
                          creditCardId: cardId, 
                          categoryId: catId, 
                          isPaid: false, 
                          isInstallment: true, 
                          installmentId: installmentGroupId, 
                          installmentCurrent: i + 1, 
                          installmentTotal: totalInstallments, 
                          frequency: 'MONTHLY'
                      }
                  });
              }
          } else if (isRecurring) {
              const nextDate = new Date(baseDate);
              if (recurrence === 'WEEKLY') nextDate.setDate(baseDate.getDate() + 7);
              else if (recurrence === 'YEARLY') nextDate.setFullYear(baseDate.getFullYear() + 1);
              else nextDate.setMonth(baseDate.getMonth() + 1);
              
              await tx.transaction.create({
                  data: {
                      description, amount, type: type as any, date: baseDate, workspaceId,
                      bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
                      creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
                      categoryId: catId, isPaid: paymentMethod === 'ACCOUNT',
                      isRecurring: true, nextRecurringDate: nextDate, frequency: recurrence as any,
                      goalId: goalIdToLink
                  }
              });
              if (paymentMethod === 'ACCOUNT' && accountId) {
                 const op = type === 'INCOME' ? 'increment' : 'decrement';
                 await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: amount } } });
              }
          } else {
              await tx.transaction.create({
                  data: {
                      description, amount, type: type as any, date: baseDate, workspaceId,
                      bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
                      creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
                      categoryId: catId, isPaid: paymentMethod === 'ACCOUNT', isRecurring: false, frequency: 'NONE',
                      goalId: goalIdToLink
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
  revalidatePath('/dashboard/goals');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const { user, error } = await validateUser('transactions_delete');
  if (error || !user) return { error };

  const t = await prisma.transaction.findUnique({ where: { id }, include: { goal: true } }); 
  if (!t) return { error: "Não encontrado" };

  try {
    await prisma.$transaction(async (tx) => {
        if (t.isPaid && t.bankAccountId) {
            const op = t.type === 'INCOME' ? 'decrement' : 'increment';
            await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { [op]: t.amount } } });
        }

        if (t.isPaid && t.goalId) {
            const isLinked = t.goal?.linkedAccountId === t.bankAccountId;
            let goalOp;
            if (isLinked) {
                goalOp = t.type === 'INCOME' ? 'decrement' : 'increment';
            } else {
                goalOp = t.type === 'EXPENSE' ? 'decrement' : 'increment';
            }
            await tx.goal.update({ where: { id: t.goalId }, data: { currentAmount: { [goalOp]: t.amount } } });
        }

        if (t.isInstallment && t.installmentId) {
            await tx.transaction.deleteMany({ where: { workspaceId: t.workspaceId, installmentId: t.installmentId } });
        } else {
            await tx.transaction.delete({ where: { id } });
        }
    });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Transaction', details: `Apagou: ${t.description}` });
  } catch(e) { return { error: "Erro ao apagar." }; }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/goals');
  return { success: true };
}

// --- CORREÇÃO 4: PERFORMANCE DA IMPORTAÇÃO (BATCHING) ---
export async function importTransactions(accountId: string, transactions: any[]) {
    const { user, error } = await validateUser('transactions_create');
    if (error || !user) return { error };
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };

    try {
        const validTransactions = transactions.filter(t => t.date && !isNaN(Number(t.amount)) && t.description);
        if (validTransactions.length === 0) return { error: "Nenhuma transação válida." };

        // 1. Preparar dados
        const txsToProcess = validTransactions.map(t => {
            const date = new Date(t.date);
            const absAmount = Math.abs(Number(t.amount));
            const importHash = t.externalId ? null : generateTransactionHash(date, absAmount, t.description);
            return {
                ...t,
                date,
                absAmount,
                type: t.amount >= 0 ? 'INCOME' : 'EXPENSE',
                importHash
            };
        });

        // 2. Buscar duplicatas em Lote (Bulk Read)
        const hashes = txsToProcess.filter(t => t.importHash).map(t => t.importHash);
        const externalIds = txsToProcess.filter(t => t.externalId).map(t => t.externalId);

        const existingTxs = await prisma.transaction.findMany({
            where: {
                workspaceId: account.workspaceId,
                OR: [
                    { importHash: { in: hashes as string[] } },
                    { externalId: { in: externalIds as string[] } }
                ]
            },
            select: { importHash: true, externalId: true }
        });

        const existingSet = new Set([
            ...existingTxs.map(t => t.importHash),
            ...existingTxs.map(t => t.externalId)
        ].filter(Boolean));

        const newTxs = txsToProcess.filter(t => 
            !existingSet.has(t.importHash) && !existingSet.has(t.externalId)
        );

        if (newTxs.length === 0) return { success: true, message: "Todas duplicadas." };

        // 3. Resolver Categorias
        // (Simplificado: Cria uma categoria "Importados" única se não vier especificada, para evitar N+1 em categories)
        // Se precisar de categorização individual complexa, ideal fazer em dois passos, mas aqui vamos otimizar o fluxo principal.
        const defaultCat = await prisma.category.upsert({
            where: { workspaceId_name_type: { workspaceId: account.workspaceId, name: "Importados", type: "EXPENSE" } },
            update: {}, create: { name: "Importados", type: "EXPENSE", workspaceId: account.workspaceId }
        });

        // 4. Criação em Massa (CreateMany)
        await prisma.transaction.createMany({
            data: newTxs.map(t => ({
                description: t.description,
                amount: t.absAmount,
                type: t.type as any,
                date: t.date,
                workspaceId: account.workspaceId,
                bankAccountId: accountId,
                categoryId: t.categoryId || defaultCat.id,
                isPaid: true,
                externalId: t.externalId || null,
                importHash: t.importHash
            }))
        });

        // 5. Atualizar Saldo (Única Query)
        const totalIncome = newTxs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.absAmount, 0);
        const totalExpense = newTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.absAmount, 0);
        const netChange = totalIncome - totalExpense;

        if (netChange !== 0) {
            const op = netChange > 0 ? 'increment' : 'decrement';
            await prisma.bankAccount.update({
                where: { id: accountId },
                data: { balance: { [op]: Math.abs(netChange) } }
            });
        }

        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `Importou ${newTxs.length} transações` });

    } catch(e) { 
        console.error(e);
        return { error: "Erro na importação em massa" }; 
    }
    
    revalidatePath('/dashboard/transactions'); 
    revalidatePath('/dashboard/accounts'); 
    revalidatePath('/dashboard');
    return { success: true };
}

export async function stopTransactionRecurrence(id: string) {
  const { user, error } = await validateUser('transactions_edit');
  if (error || !user) return { error };
  try { await prisma.transaction.update({ where: { id }, data: { isRecurring: false, nextRecurringDate: null } }); await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Transaction', entityId: id, details: 'Encerrou recorrência' }); } catch (e) { return { error: "Erro ao cancelar." }; }
  revalidatePath('/dashboard'); return { success: true };
}

export async function getRecurringTransactions() {
  const { user, error } = await validateUser(); if (error || !user) return []; const workspaceId = await getActiveWorkspaceId(user); if (!workspaceId) return [];
  const recurrings = await prisma.transaction.findMany({ where: { workspaceId, isRecurring: true, nextRecurringDate: { not: null } }, orderBy: { nextRecurringDate: 'asc' }, include: { category: true } });
  return recurrings.map(t => ({ ...t, amount: Number(t.amount), date: t.date.toISOString(), nextRecurringDate: t.nextRecurringDate?.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() }));
}

// --- CORREÇÃO 5: LÓGICA DE CONTAS A PAGAR ---
export async function getUpcomingBills() {
  const { user, error } = await validateUser(); if (error || !user) return []; const workspaceId = await getActiveWorkspaceId(user); if (!workspaceId) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0); const limitDate = addDays(today, 30); 
  const bills = await prisma.transaction.findMany({ where: { workspaceId, type: 'EXPENSE', isPaid: false, creditCardId: null, date: { lte: limitDate } }, orderBy: { date: 'asc' }, take: 10, include: { category: true } });
  
  const cards = await prisma.creditCard.findMany({ where: { workspaceId }, include: { transactions: { where: { isPaid: false, type: 'EXPENSE', date: { lte: limitDate } } } } });
  
  const cardBills = cards.map(card => {
    const currentYear = today.getFullYear(); 
    const currentMonth = today.getMonth(); 
    
    // Calcula a data de vencimento deste mês
    let dueDate = new Date(currentYear, currentMonth, card.dueDay);

    // Se hoje já passou da data de fechamento, a fatura em aberto refere-se ao próximo vencimento?
    // Depende: se tivermos transações não pagas "antigas" (antes do fechamento), elas estão atrasadas no vencimento atual.
    // Se só tivermos transações "novas" (após fechamento), elas são para o próximo mês.
    // Lógica simplificada segura: Se hoje é maior que o dia do fechamento, assumimos o próximo mês, 
    // EXCETO se houver transações antigas pendentes.
    
    // Verifica se existe alguma transação pendente com data ANTERIOR ou IGUAL ao fechamento deste mês
    const closingDateThisMonth = new Date(currentYear, currentMonth, card.closingDay);
    const hasOldPending = card.transactions.some(t => t.date <= closingDateThisMonth);

    if (today.getDate() > card.closingDay && !hasOldPending) {
         dueDate = addMonths(dueDate, 1);
    }
    // Se today > closingDay MAS tem pendência antiga, mantém dueDate original (que vai aparecer como Atrasada/Hoje)

    const total = card.transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    return { id: card.id, description: `Fatura ${card.name}`, amount: total, date: dueDate, isCard: true, bank: card.bank, category: { name: 'Cartão de Crédito', icon: 'CreditCard', color: '#64748b' } };
  }).filter(c => c.amount > 0 && c.date <= limitDate);

  const allBills = [ ...bills.map(b => ({ id: b.id, description: b.description, amount: Number(b.amount), date: b.date, category: b.category ? { name: b.category.name, icon: b.category.icon || undefined, color: b.category.color || undefined } : undefined, isCard: false, bank: undefined })), ...cardBills ].sort((a, b) => a.date.getTime() - b.date.getTime());
  return allBills.map(b => ({ ...b, date: b.date.toISOString() }));
}