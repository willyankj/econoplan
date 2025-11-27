'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";
// NOVO IMPORT
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

  const rawData = Object.fromEntries(formData);
  const parsed = TransactionSchema.safeParse(rawData);
  if (!parsed.success) return { error: "Dados inválidos" };
  
  const data = parsed.data;
  const date = new Date(data.date + "T12:00:00");

  let workspaceId = "";
  let categoryId = "";

  if (id) {
    const oldT = await prisma.transaction.findUnique({ where: { id } });
    if (!oldT) return { error: "Erro" };

    workspaceId = oldT.workspaceId;

    if (oldT.isPaid && oldT.bankAccountId) {
        const opRev = oldT.type === 'INCOME' ? 'decrement' : 'increment';
        await prisma.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { [opRev]: oldT.amount } } });
        const opNew = data.type === 'INCOME' ? 'increment' : 'decrement';
        await prisma.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { [opNew]: data.amount } } });
    }

    const cat = await prisma.category.upsert({
        where: { 
          workspaceId_name_type: { 
            workspaceId: oldT.workspaceId, 
            name: data.category, 
            type: data.type 
          } 
        },
        update: {}, 
        create: { name: data.category, type: data.type, workspaceId: oldT.workspaceId }
    });
    categoryId = cat.id;

    await prisma.transaction.update({ where: { id }, data: { description: data.description, amount: data.amount, date, categoryId: cat.id } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Transaction', entityId: id, details: `Atualizou: ${data.description}` });
  
  } else {
    const wsId = await getActiveWorkspaceId(user);
    if (!wsId) return { error: "Sem workspace" };
    workspaceId = wsId;

    const cat = await prisma.category.upsert({
        where: { 
          workspaceId_name_type: { 
            workspaceId, 
            name: data.category, 
            type: data.type 
          } 
        },
        update: {}, 
        create: { name: data.category, type: data.type, workspaceId }
    });
    categoryId = cat.id;

    let newTx;

    if (data.paymentMethod === 'ACCOUNT' && data.accountId) {
        newTx = await prisma.transaction.create({
            data: { description: data.description, amount: data.amount, type: data.type, date, workspaceId, bankAccountId: data.accountId, categoryId: cat.id, isPaid: true }
        });
        const op = data.type === 'INCOME' ? 'increment' : 'decrement';
        await prisma.bankAccount.update({ where: { id: data.accountId }, data: { balance: { [op]: data.amount } } });
    } else if (data.cardId) {
        newTx = await prisma.transaction.create({
            data: { description: data.description, amount: data.amount, type: data.type, date, workspaceId, creditCardId: data.cardId, categoryId: cat.id, isPaid: false }
        });
    }

    if (newTx) {
        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', entityId: newTx.id, details: `Nova ${data.type === 'INCOME' ? 'Receita' : 'Despesa'}: ${data.description}` });
    }
  }

  // --- VERIFICAÇÃO DE ORÇAMENTO (NOVO) ---
  if (data.type === 'EXPENSE' && categoryId && workspaceId) {
      await checkBudgetThresholds(user.id, workspaceId, categoryId, date);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
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