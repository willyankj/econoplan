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
      
      // --- CORREÇÃO AQUI: Capturamos o cartão criado na variável 'newCard' ---
      const newCard = await prisma.creditCard.create({ data: { ...data, workspaceId } });
      
      // Agora usamos newCard.id (antes estava card.id que não existia)
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Card', entityId: newCard.id, details: `Criou cartão ${data.name}` });
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
      const pendingTransactions = await prisma.transaction.aggregate({
          where: { creditCardId: cardId, isPaid: false, date: { lte: date } },
          _sum: { amount: true }
      });
      
      const totalPending = Number(pendingTransactions._sum.amount || 0);
      
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
          prisma.transaction.updateMany({ where: { creditCardId: cardId, isPaid: false, date: { lte: date } }, data: { isPaid: true } })
      ]);

      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Card', details: `Pagou fatura ${card.name}` });
  } catch (e) { return { error: "Erro no pagamento." }; }

  revalidatePath('/dashboard');
  return { success: true };
}

// --- TRANSAÇÕES GERAIS (INCOME, EXPENSE, TRANSFER) ---

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

  // --- LÓGICA DE TRANSFERÊNCIA (AGORA UNIFICADA) ---
  if (type === 'TRANSFER') {
      if (!accountId || !destinationAccountId) return { error: "Selecione as contas de origem e destino." };
      if (accountId === destinationAccountId) return { error: "As contas devem ser diferentes." };

      try {
          await prisma.$transaction(async (tx) => {
              // Busca nomes das contas para descrição automática
              const sourceAcc = await tx.bankAccount.findUnique({ where: { id: accountId } });
              const destAcc = await tx.bankAccount.findUnique({ where: { id: destinationAccountId } });

              if (!sourceAcc || !destAcc) throw new Error("Contas não encontradas.");

              // Cria UMA transação vinculando as duas contas
              await tx.transaction.create({
                  data: {
                      description: `Transferência: ${sourceAcc.name} > ${destAcc.name}`,
                      amount, 
                      type: 'TRANSFER', 
                      date: baseDate, 
                      workspaceId, 
                      bankAccountId: accountId, // Origem
                      recipientAccountId: destinationAccountId, // Destino
                      isPaid: true,
                      category: { connectOrCreate: { where: { workspaceId_name_type: { workspaceId, name: "Transferência", type: "TRANSFER" } }, create: { name: "Transferência", type: "TRANSFER", workspaceId, icon: "ArrowRightLeft", color: "#64748b" } } }
                  }
              });

              // Atualiza os saldos
              await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
              await tx.bankAccount.update({ where: { id: destinationAccountId }, data: { balance: { increment: amount } } });
          });
          revalidatePath('/dashboard');
          return { success: true };
      } catch (e) { return { error: "Erro na transferência." }; }
  }

  // --- LÓGICA PADRÃO (INCOME/EXPENSE) ---
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

  // Edição (Simplificada: não suporta mudar tipo de TRANSFER para INCOME por enquanto para evitar complexidade de saldo)
  if (id) {
      try {
          await prisma.$transaction(async (tx) => {
              const oldT = await tx.transaction.findUnique({ where: { id } });
              if (!oldT) throw new Error("Transação original não encontrada");

              await tx.transaction.update({ 
                  where: { id }, 
                  data: { description, amount, date: baseDate, categoryId: catId } 
              });

              // Ajuste de saldo na edição
              if (oldT.isPaid && oldT.bankAccountId && oldT.type !== 'TRANSFER') {
                  const diff = amount - Number(oldT.amount);
                  if (diff !== 0) {
                      if (oldT.type === 'INCOME') {
                          await tx.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { increment: diff } } });
                      } else if (oldT.type === 'EXPENSE') {
                          await tx.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { decrement: diff } } });
                      }
                  }
              }
          });
          return { success: true };
      } catch (e) { return { error: "Erro ao atualizar transação." }; }
  }

  // Criação (INCOME/EXPENSE)
  const isInstallment = recurrence === 'INSTALLMENT' && (installments || 0) > 1;
  const isRecurring = ['MONTHLY', 'WEEKLY', 'YEARLY'].includes(recurrence || '');

  try {
      await prisma.$transaction(async (tx) => {
          
          if (isInstallment && cardId) {
              const installmentGroupId = uuidv4();
              const totalInstallments = installments || 1;
              const rawInstallmentValue = Math.floor((amount / totalInstallments) * 100) / 100;
              const firstInstallmentValue = Number((amount - (rawInstallmentValue * (totalInstallments - 1))).toFixed(2));

              for (let i = 0; i < totalInstallments; i++) {
                  const installmentDate = addMonths(baseDate, i);
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
                      description, amount, type: type as any, date: baseDate, workspaceId,
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
  revalidatePath('/dashboard/goals');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const { user, error } = await validateUser('transactions_delete');
  if (error || !user) return { error };

  const t = await prisma.transaction.findUnique({ where: { id }, include: { goal: true, vault: true } }); 
  if (!t) return { error: "Não encontrado" };

  try {
    await prisma.$transaction(async (tx) => {
        // Reverter Saldo: Conta Bancária (Origem)
        if (t.isPaid && t.bankAccountId) {
            if (t.type === 'INCOME') {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { decrement: t.amount } } });
            } else if (t.type === 'EXPENSE') {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
            } else if (t.type === 'TRANSFER' && t.recipientAccountId) {
                // Se era transferência, devolve para a origem
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
            } else if (t.type === 'VAULT_DEPOSIT') {
                // Devolve para a conta
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
            } else if (t.type === 'VAULT_WITHDRAW') {
                // Tira da conta
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { decrement: t.amount } } });
            }
        }

        // Reverter Saldo: Conta Destino (Transferência)
        if (t.isPaid && t.recipientAccountId && t.type === 'TRANSFER') {
            await tx.bankAccount.update({ where: { id: t.recipientAccountId }, data: { balance: { decrement: t.amount } } });
        }

        // Reverter Saldo: Cofrinho/Meta
        if (t.isPaid && t.vaultId) {
            if (t.type === 'VAULT_DEPOSIT') {
                await tx.vault.update({ where: { id: t.vaultId }, data: { balance: { decrement: t.amount } } });
            } else if (t.type === 'VAULT_WITHDRAW') {
                await tx.vault.update({ where: { id: t.vaultId }, data: { balance: { increment: t.amount } } });
            }
            // Sincroniza meta se houver
            const vault = await tx.vault.findUnique({ where: { id: t.vaultId }, include: { goal: true } });
            if (vault && vault.goal) {
                await tx.goal.update({ where: { id: vault.goal.id }, data: { currentAmount: vault.balance } });
            }
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

export async function importTransactions(accountId: string, transactions: any[]) {
    const { user, error } = await validateUser('transactions_create');
    if (error || !user) return { error };
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };

    try {
        const validTransactions = transactions.filter(t => t.date && !isNaN(Number(t.amount)) && t.description);
        if (validTransactions.length === 0) return { error: "Nenhuma transação válida." };

        const txsToProcess = validTransactions.map(t => {
            const date = new Date(t.date);
            const absAmount = Math.abs(Number(t.amount));
            const importHash = t.externalId ? null : generateTransactionHash(date, absAmount, t.description);
            return { ...t, date, absAmount, type: t.amount >= 0 ? 'INCOME' : 'EXPENSE', importHash };
        });

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

        const defaultCat = await prisma.category.upsert({
            where: { workspaceId_name_type: { workspaceId: account.workspaceId, name: "Importados", type: "EXPENSE" } },
            update: {}, create: { name: "Importados", type: "EXPENSE", workspaceId: account.workspaceId }
        });

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

export async function getUpcomingBills() {
  const { user, error } = await validateUser(); if (error || !user) return []; const workspaceId = await getActiveWorkspaceId(user); if (!workspaceId) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0); const limitDate = addDays(today, 30); 
  const bills = await prisma.transaction.findMany({ where: { workspaceId, type: 'EXPENSE', isPaid: false, creditCardId: null, date: { lte: limitDate } }, orderBy: { date: 'asc' }, take: 10, include: { category: true } });
  
  const cards = await prisma.creditCard.findMany({ where: { workspaceId }, include: { transactions: { where: { isPaid: false, type: 'EXPENSE', date: { lte: limitDate } } } } });
  
  const cardBills = cards.map(card => {
    const currentYear = today.getFullYear(); 
    const currentMonth = today.getMonth(); 
    let dueDate = new Date(currentYear, currentMonth, card.dueDay);
    const closingDateThisMonth = new Date(currentYear, currentMonth, card.closingDay);
    const hasOldPending = card.transactions.some(t => t.date <= closingDateThisMonth);

    if (today.getDate() > card.closingDay && !hasOldPending) {
         dueDate = addMonths(dueDate, 1);
    }
    const total = card.transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    return { id: card.id, description: `Fatura ${card.name}`, amount: total, date: dueDate, isCard: true, bank: card.bank, category: { name: 'Cartão de Crédito', icon: 'CreditCard', color: '#64748b' } };
  }).filter(c => c.amount > 0 && c.date <= limitDate);

  const allBills = [ ...bills.map(b => ({ id: b.id, description: b.description, amount: Number(b.amount), date: b.date, category: b.category ? { name: b.category.name, icon: b.category.icon || undefined, color: b.category.color || undefined } : undefined, isCard: false, bank: undefined })), ...cardBills ].sort((a, b) => a.date.getTime() - b.date.getTime());
  return allBills.map(b => ({ ...b, date: b.date.toISOString() }));
}

// --------------------------------------------------------
// --- MÓDULO DE COFRINHOS E METAS (ATUALIZADO) ---
// --------------------------------------------------------

const VaultSchema = z.object({
  name: z.string().min(1, "Nome do cofrinho é obrigatório"),
  bankAccountId: z.string().uuid("Conta bancária inválida"),
  targetAmount: z.coerce.number().optional(),
  initialBalance: z.coerce.number().optional(),
});

export async function upsertVault(formData: FormData, id?: string) {
  const { user, error } = await validateUser();
  if (error || !user) return { error };

  const parsed = VaultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  const { name, bankAccountId, targetAmount, initialBalance } = parsed.data;

  try {
    if (id) {
      await prisma.vault.update({ 
        where: { id }, 
        data: { name, targetAmount } 
      });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Vault', entityId: id, details: `Atualizou cofrinho ${name}` });
    } else {
      await prisma.$transaction(async (tx) => {
          const startBalance = initialBalance || 0;
          const account = await tx.bankAccount.findUnique({ where: { id: bankAccountId } });
          if (!account) throw new Error("Conta não encontrada");

          const vault = await tx.vault.create({
            data: { 
                name, 
                bankAccountId, 
                targetAmount, 
                balance: startBalance 
            }
          });
          // SEM TRANSAÇÃO PARA SALDO INICIAL (OPENING BALANCE)
          
          await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Vault', entityId: vault.id, details: `Criou cofrinho ${name}` });
      });
    }
  } catch (e: any) { return { error: e.message || "Erro ao salvar cofrinho." }; }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/accounts`);
  return { success: true };
}

export async function deleteVault(id: string) {
    const { user, error } = await validateUser();
    if (error || !user) return { error };

    const vault = await prisma.vault.findUnique({ where: { id } });
    if (!vault) return { error: "Cofrinho não encontrado" };

    if (Number(vault.balance) > 0) return { error: "O cofrinho precisa estar vazio para ser excluído. Resgate o valor primeiro." };

    try {
        await prisma.vault.delete({ where: { id } });
        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Vault', details: `Excluiu cofrinho ${vault.name}` });
    } catch (e) { return { error: "Erro ao excluir." }; }

    revalidatePath('/dashboard');
    return { success: true };
}

// --- LÓGICA DE APORTE UNIFICADA ---
export async function transferVault(vaultId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW') {
  const { user, error } = await validateUser();
  if (error || !user) return { error };

  if (amount <= 0) return { error: "Valor deve ser maior que zero." };

  const vault = await prisma.vault.findUnique({ 
    where: { id: vaultId },
    include: { bankAccount: true, goal: true } 
  });
  
  if (!vault) return { error: "Cofrinho não encontrado" };

  try {
    await prisma.$transaction(async (tx) => {
      const isDeposit = type === 'DEPOSIT';
      
      if (isDeposit) {
        if (Number(vault.bankAccount.balance) < amount) throw new Error("Saldo insuficiente na conta corrente.");
      } else {
        if (Number(vault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho.");
      }

      const accountOp = isDeposit ? 'decrement' : 'increment';
      await tx.bankAccount.update({
          where: { id: vault.bankAccountId },
          data: { balance: { [accountOp]: amount } }
      });

      const vaultOp = isDeposit ? 'increment' : 'decrement';
      const updatedVault = await tx.vault.update({
        where: { id: vaultId },
        data: { balance: { [vaultOp]: amount } }
      });

      if (vault.goal) {
        await tx.goal.update({
            where: { id: vault.goal.id },
            data: { currentAmount: updatedVault.balance }
        });
      }

      const txType = isDeposit ? 'VAULT_DEPOSIT' : 'VAULT_WITHDRAW';
      
      // DESCRIÇÕES AUTOEXPLICATIVAS
      let description = "";
      if (isDeposit) {
          description = `Aporte: ${vault.bankAccount.name} > Cofrinho ${vault.name}`;
      } else {
          description = `Resgate: Cofrinho ${vault.name} > ${vault.bankAccount.name}`;
      }

      await tx.transaction.create({
        data: {
          description,
          amount,
          type: txType,
          date: new Date(),
          workspaceId: vault.bankAccount.workspaceId,
          bankAccountId: vault.bankAccountId,
          vaultId: vault.id,
          isPaid: true,
          // Sem categoria para não poluir
        }
      });
    });

    revalidatePath('/dashboard');
    return { success: true };

  } catch (e: any) {
    return { error: e.message || "Erro na movimentação." };
  }
}

const GoalSchema = z.object({
    name: z.string().min(1),
    targetAmount: z.coerce.number().positive(),
    deadline: z.string().optional(),
    vaultId: z.string().optional(),
    createVault: z.string().optional(),
    newVaultName: z.string().optional(),
    newVaultAccountId: z.string().optional(),
    contributionRules: z.string().optional(),
});

export async function upsertGoal(formData: FormData, id?: string, isShared = false) {
    const { user, error } = await validateUser('goals_create');
    if (error || !user) return { error };

    const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Dados inválidos" };
    
    const { name, targetAmount, deadline, vaultId, createVault, newVaultName, newVaultAccountId, contributionRules } = parsed.data;
    const workspaceId = await getActiveWorkspaceId(user);
    
    let finalVaultId = vaultId;

    try {
        await prisma.$transaction(async (tx) => {
            // Se optou por criar um cofrinho novo AGORA
            if (createVault === "true") {
                if (!newVaultName || !newVaultAccountId) throw new Error("Para criar um novo cofrinho, informe nome e conta.");
                
                const newVault = await tx.vault.create({
                    data: {
                        name: newVaultName,
                        bankAccountId: newVaultAccountId,
                        targetAmount: targetAmount, // O cofrinho herda a meta
                        balance: 0
                    }
                });
                finalVaultId = newVault.id;
            }

            // Validação: Meta precisa de cofrinho (a menos que seja compartilhada complexa, mas vamos focar no padrão)
            if (!isShared && (!finalVaultId || finalVaultId === 'none')) {
                throw new Error("É obrigatório vincular a meta a um cofrinho.");
            }

            // Pega o saldo atual do cofrinho para garantir sincronia
            let currentBalance = 0;
            if (finalVaultId) {
                const vault = await tx.vault.findUnique({ where: { id: finalVaultId } });
                if (vault) currentBalance = Number(vault.balance);
            }

            const data: any = {
                name,
                targetAmount,
                currentAmount: currentBalance, // Sincronizado com o cofrinho
                deadline: deadline ? new Date(deadline) : null,
                contributionRules: contributionRules ? JSON.parse(contributionRules) : undefined,
                vaultId: finalVaultId,
            };

            if (!isShared && workspaceId) data.workspaceId = workspaceId;
            if (isShared) data.tenantId = user.tenantId;

            if (id) {
                await tx.goal.update({ where: { id }, data });
            } else {
                await tx.goal.create({ data });
            }
        });

        revalidatePath('/dashboard/goals');
        return { success: true };
    } catch(e: any) { 
        return { error: e.message || "Erro ao salvar meta." }; 
    }
}