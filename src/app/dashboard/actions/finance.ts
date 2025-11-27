'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { notifyBudgetWarning, notifyBudgetExceeded } from "@/lib/notifications";

const TransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string().min(10),
  category: z.string().min(1),
  paymentMethod: z.enum(["ACCOUNT", "CREDIT_CARD"]).optional(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
});

// === FUNÇÃO AUXILIAR PARA VERIFICAR ORÇAMENTOS ===
async function checkBudgetThresholds(userId: string, workspaceId: string, categoryId: string, date: Date) {
    // 1. Busca se existe orçamento para esta categoria
    const budget = await prisma.budget.findFirst({
        where: { workspaceId, categoryId },
        include: { category: true }
    });

    if (!budget) return;

    // 2. Define o intervalo do mês da transação
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // 3. Soma todos os gastos dessa categoria no mês (incluindo o atual)
    const result = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            workspaceId,
            categoryId,
            type: 'EXPENSE',
            date: { gte: firstDay, lte: lastDay }
        }
    });

    const totalSpent = Number(result._sum.amount || 0);
    const target = Number(budget.targetAmount);

    if (target <= 0) return;

    const percentage = (totalSpent / target) * 100;
    const categoryName = budget.category?.name || "Categoria";

    // 4. Dispara notificações conforme as regras
    if (percentage >= 100) {
        // Severo: Estourou
        await notifyBudgetExceeded(userId, categoryName);
    } else if (percentage >= 90) {
        // Warning: Quase lá (90% a 99%)
        await notifyBudgetWarning(userId, categoryName, Math.round(percentage));
    }
}

// === CONTAS ===
export async function upsertAccount(formData: FormData, id?: string) {
  const permission = id ? 'accounts_edit' : 'accounts_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const rawBalance = formData.get("balance") as string;
  const balance = rawBalance ? parseFloat(rawBalance) : 0;

  const data = {
    name: formData.get("name") as string,
    bank: formData.get("bank") as string,
    balance: isNaN(balance) ? 0 : balance
  };

  if (id) {
    await prisma.bankAccount.update({ where: { id }, data });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Account', entityId: id, details: `Editou conta ${data.name}` });
  } else {
    const workspaceId = await getActiveWorkspaceId(user);
    if(!workspaceId) return { error: "Sem workspace" };
    
    const acc = await prisma.bankAccount.create({ 
        data: { ...data, workspaceId, isIncluded: true } 
    });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Account', entityId: acc.id, details: `Criou conta ${data.name}` });
  }
  
  revalidatePath('/dashboard/accounts'); 
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { user, error } = await validateUser('accounts_delete');
  if (error || !user) return { error };
  
  const acc = await prisma.bankAccount.findUnique({ where: { id } });
  await prisma.bankAccount.delete({ where: { id } });
  
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Account', details: `Apagou conta ${acc?.name || 'Desconhecida'}` });
  
  revalidatePath('/dashboard/accounts'); 
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

// === CARTÕES ===
export async function upsertCard(formData: FormData, id?: string) {
  const permission = id ? 'cards_edit' : 'cards_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const rawLimit = formData.get("limit") as string;
  const limit = rawLimit ? parseFloat(rawLimit) : 0;
  const rawClosing = formData.get("closingDay") as string;
  const closingDay = rawClosing ? parseInt(rawClosing) : 1;
  const rawDue = formData.get("dueDay") as string;
  const dueDay = rawDue ? parseInt(rawDue) : 10;

  const data = {
    name: formData.get("name") as string,
    bank: formData.get("bank") as string,
    limit: isNaN(limit) ? 0 : limit,
    closingDay: isNaN(closingDay) ? 1 : closingDay,
    dueDay: isNaN(dueDay) ? 10 : dueDay,
  };

  if (id) {
    await prisma.creditCard.update({ where: { id }, data });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Card', entityId: id, details: `Atualizou cartão ${data.name}` });
  } else {
    const workspaceId = await getActiveWorkspaceId(user);
    if(!workspaceId) return { error: "Sem workspace" };
    
    const card = await prisma.creditCard.create({ data: { ...data, workspaceId } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Card', entityId: card.id, details: `Criou cartão ${data.name}` });
  }
  
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function deleteCreditCard(id: string) {
  const { user, error } = await validateUser('cards_delete');
  if (error || !user) return { error };
  
  const card = await prisma.creditCard.findUnique({ where: { id } });
  await prisma.creditCard.delete({ where: { id } });
  
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Card', details: `Apagou cartão ${card?.name}` });
  
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function payCreditCardInvoice(formData: FormData) {
  const { user, error } = await validateUser('cards_pay');
  if (error || !user) return { error };

  const cardId = formData.get("cardId") as string;
  const accountId = formData.get("accountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = new Date((formData.get("date") as string) + "T12:00:00");

  const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
  if(!card) return { error: "Cartão inválido" };

  const category = await prisma.category.upsert({ 
      where: { 
        workspaceId_name_type: { 
          workspaceId: card.workspaceId, 
          name: "Pagamento de Fatura", 
          type: "EXPENSE" 
        } 
      }, 
      update: {}, 
      create: { 
        name: "Pagamento de Fatura", 
        type: "EXPENSE", 
        workspaceId: card.workspaceId 
      } 
  });

  await prisma.$transaction([
      prisma.transaction.create({ data: { description: `Fatura - ${card.name}`, amount, type: "EXPENSE", date, workspaceId: card.workspaceId, bankAccountId: accountId, categoryId: category.id, isPaid: true } }),
      prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
      prisma.transaction.updateMany({ where: { creditCardId: cardId, isPaid: false, date: { lte: date } }, data: { isPaid: true } })
  ]);

  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Card', details: `Pagou fatura ${card.name} (R$ ${amount})` });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

// === TRANSAÇÕES ===
export async function upsertTransaction(formData: FormData, id?: string) {
  const permission = id ? 'transactions_edit' : 'transactions_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  // Campos básicos
  const description = formData.get("description") as string;
  const rawAmount = formData.get("amount") as string;
  const amount = parseFloat(rawAmount);
  const type = formData.get("type") as "INCOME" | "EXPENSE";
  const dateStr = formData.get("date") as string;
  const categoryName = formData.get("category") as string;
  
  // Campos de Repetição
  const recurrence = formData.get("recurrence") as string; // 'NONE', 'MONTHLY', 'INSTALLMENT'
  const installments = parseInt((formData.get("installments") as string) || "1");
  
  // Campos de Vinculação
  const paymentMethod = formData.get("paymentMethod") as string;
  const accountId = formData.get("accountId") as string;
  const cardId = formData.get("cardId") as string;

  const baseDate = new Date(dateStr + "T12:00:00");
  let workspaceId = "";
  
  // --- LÓGICA DE WORKSPACE E CATEGORIA (Compartilhada) ---
  if (id) {
      const oldT = await prisma.transaction.findUnique({ where: { id } });
      if (!oldT) return { error: "Transação não encontrada" };
      workspaceId = oldT.workspaceId;
      
      // (Lógica de estorno de saldo na edição omitida para brevidade, mantenha a sua atual se desejar)
  } else {
      workspaceId = await getActiveWorkspaceId(user);
  }

  if (!workspaceId) return { error: "Workspace inválido" };

  // Garante/Cria Categoria
  const cat = await prisma.category.upsert({
      where: { workspaceId_name_type: { workspaceId, name: categoryName, type } },
      update: {}, create: { name: categoryName, type, workspaceId }
  });

  // --- CENÁRIO 1: EDIÇÃO (Simples, não muda parcelamento para evitar caos) ---
  if (id) {
      await prisma.transaction.update({
          where: { id },
          data: { description, amount, date: baseDate, categoryId: cat.id }
      });
      return { success: true };
  }

  // --- CENÁRIO 2: CRIAÇÃO (Com Parcelamento ou Recorrência) ---
  
  const isInstallment = recurrence === 'INSTALLMENT' && installments > 1;
  const isRecurring = recurrence === 'MONTHLY' || recurrence === 'WEEKLY' || recurrence === 'YEARLY';

  try {
      await prisma.$transaction(async (tx) => {
          
          // A. PARCELAMENTO (Cria N transações futuras)
          if (isInstallment && cardId) {
              const installmentGroupId = uuidv4(); // ID para agrupar todas
              const installmentValue = amount / installments; // Valor dividido

              for (let i = 0; i < installments; i++) {
                  const installmentDate = new Date(baseDate);
                  installmentDate.setMonth(baseDate.getMonth() + i); // +1 mês para cada parcela

                  await tx.transaction.create({
                      data: {
                          description: `${description} (${i + 1}/${installments})`,
                          amount: installmentValue, // Valor da parcela
                          type,
                          date: installmentDate,
                          workspaceId,
                          creditCardId: cardId,
                          categoryId: cat.id,
                          isPaid: false,
                          isInstallment: true,
                          installmentId: installmentGroupId,
                          installmentCurrent: i + 1,
                          installmentTotal: installments,
                          frequency: 'MONTHLY' // Tecnicamente é mensal durante o período
                      }
                  });
              }
              
              await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `Criou compra parcelada: ${description} em ${installments}x` });
          } 
          
          // B. RECORRÊNCIA FIXA (Cria apenas A PRIMEIRA e marca flag)
          // O "Oráculo" vai usar essa flag para projetar o futuro, e um Cron Job criará as próximas mês a mês.
          else if (isRecurring) {
              const nextDate = new Date(baseDate);
              nextDate.setMonth(baseDate.getMonth() + 1);
              
              const newTx = await tx.transaction.create({
                  data: {
                      description,
                      amount,
                      type,
                      date: baseDate,
                      workspaceId,
                      bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
                      creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
                      categoryId: cat.id,
                      isPaid: paymentMethod === 'ACCOUNT', // Se for conta, já nasce pago? Depende. Vamos assumir que sim para facilitar.
                      isRecurring: true,
                      nextRecurringDate: nextDate,
                      frequency: recurrence as any // 'MONTHLY', etc
                  }
              });
              // Opcional: Atualizar saldo se for conta
              if (paymentMethod === 'ACCOUNT' && accountId) {
                 const op = type === 'INCOME' ? 'increment' : 'decrement';
                 await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: amount } } });
              }
          } 
          
          // C. TRANSAÇÃO SIMPLES (Padrão)
          else {
              const newTx = await tx.transaction.create({
                  data: {
                      description,
                      amount,
                      type,
                      date: baseDate,
                      workspaceId,
                      bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
                      creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
                      categoryId: cat.id,
                      isPaid: paymentMethod === 'ACCOUNT',
                      isRecurring: false,
                      frequency: 'NONE'
                  }
              });
               // Atualizar saldo
               if (paymentMethod === 'ACCOUNT' && accountId) {
                  const op = type === 'INCOME' ? 'increment' : 'decrement';
                  await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: amount } } });
               }
          }
      });

  } catch (e) {
      console.error(e);
      return { error: "Erro ao criar transação." };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const { user, error } = await validateUser('transactions_delete');
  if (error || !user) return { error };

  const t = await prisma.transaction.findUnique({ where: { id } });
  if (!t) return { error: "Não encontrado" };

  if (t.isPaid && t.bankAccountId) {
      const op = t.type === 'INCOME' ? 'decrement' : 'increment';
      await prisma.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { [op]: t.amount } } });
  }

  await prisma.transaction.delete({ where: { id } });
  
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Transaction', details: `Apagou: ${t.description}` });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function importTransactions(accountId: string, transactions: any[]) {
    const { user, error } = await validateUser('transactions_create');
    if (error || !user) return { error };

    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };

    let count = 0;
    try {
        await prisma.$transaction(async (tx) => {
            for (const t of transactions) {
                const date = new Date(t.date);
                const categoryName = t.category || "Importados";
                const transactionType = t.amount >= 0 ? 'INCOME' : 'EXPENSE';

                const cat = await tx.category.upsert({
                    where: { 
                      workspaceId_name_type: { 
                        workspaceId: account.workspaceId, 
                        name: categoryName,
                        type: transactionType
                      } 
                    },
                    update: {}, 
                    create: { 
                      name: categoryName, 
                      type: transactionType, 
                      workspaceId: account.workspaceId 
                    }
                });

                await tx.transaction.create({
                    data: { description: t.description, amount: Math.abs(t.amount), type: transactionType, date, workspaceId: account.workspaceId, bankAccountId: accountId, categoryId: cat.id, isPaid: true }
                });

                const op = transactionType === 'INCOME' ? 'increment' : 'decrement';
                await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: Math.abs(t.amount) } } });
                count++;
            }
        });
        
        if (count > 0) {
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `Importou ${count} transações` });
        }

    } catch(e) { return { error: "Erro na importação" }; }

    revalidatePath('/dashboard/transactions'); 
    revalidatePath('/dashboard/accounts');
    revalidatePath('/dashboard/settings');
    return { success: true };
}