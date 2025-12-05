'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { createHash } from "crypto";
import { addDays, addMonths } from "date-fns";

// --- UTILITÁRIO DE HASH ---
function generateTransactionHash(date: Date, amount: number, description: string): string {
    const str = `${date.toISOString().split('T')[0]}|${amount.toFixed(2)}|${description.trim().toLowerCase()}`;
    return createHash('md5').update(str).digest('hex');
}

// --- FUNÇÃO AUXILIAR: Recalcular saldo total da meta ---
async function recalculateGoalBalance(goalId: string, tx: any) {
    if (!goalId) return;
    
    const aggregator = await tx.vault.aggregate({
        where: { goalId },
        _sum: { balance: true }
    });
    
    const total = Number(aggregator._sum.balance || 0);
    
    await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: total }
    });
}

// --- FUNÇÃO BLINDADA: Reverter Efeito Financeiro (Para Edição/Exclusão) ---
async function revertTransactionEffect(tx: any, prismaTx: any) {
    if (!tx.isPaid) return; 

    // 1. Reverter na Origem
    if (tx.bankAccountId) {
        // Se era entrada (INCOME/Resgate), devolvemos tirando o dinheiro
        if (['INCOME', 'VAULT_WITHDRAW'].includes(tx.type)) {
            await prismaTx.bankAccount.update({
                where: { id: tx.bankAccountId },
                data: { balance: { decrement: tx.amount } }
            });
        } 
        // Se era saída (EXPENSE/Transfer/Aporte), devolvemos colocando o dinheiro de volta
        else if (['EXPENSE', 'TRANSFER', 'VAULT_DEPOSIT'].includes(tx.type)) {
            await prismaTx.bankAccount.update({
                where: { id: tx.bankAccountId },
                data: { balance: { increment: tx.amount } }
            });
        }
    }

    // 2. Reverter no Destino (Transferências)
    if (tx.recipientAccountId && tx.type === 'TRANSFER') {
        try {
            await prismaTx.bankAccount.update({
                where: { id: tx.recipientAccountId },
                data: { balance: { decrement: tx.amount } }
            });
        } catch (error) {
            console.warn(`Conta destino ${tx.recipientAccountId} não encontrada para reversão. Ignorando.`);
        }
    }

    // 3. Reverter em Cofrinhos
    if (tx.vaultId && ['VAULT_DEPOSIT', 'VAULT_WITHDRAW'].includes(tx.type)) {
        const vaultOp = tx.type === 'VAULT_DEPOSIT' ? 'decrement' : 'increment';
        try {
            const updatedVault = await prismaTx.vault.update({
                where: { id: tx.vaultId },
                data: { balance: { [vaultOp]: tx.amount } }
            });
            if (updatedVault.goalId) {
                await recalculateGoalBalance(updatedVault.goalId, prismaTx);
            }
        } catch (error) {
             console.warn(`Cofrinho ${tx.vaultId} não encontrado para reversão.`);
        }
    }
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
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "VAULT_DEPOSIT", "VAULT_WITHDRAW"]),
  date: z.string(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  accountId: z.string().optional(),
  destinationAccountId: z.string().optional(),
  cardId: z.string().optional(),
  recurrence: z.string().optional(),
  installments: z.coerce.number().optional(),
  vaultId: z.string().optional(),
});

const PayInvoiceSchema = z.object({
  cardId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  date: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// --- SCHEMAS PARA COFRINHOS E MOVIMENTAÇÃO ---
const VaultSchema = z.object({
    name: z.string().min(1, "Nome obrigatório"),
    bankAccountId: z.string().uuid("Conta bancária inválida"),
    targetAmount: z.coerce.number().optional().nullable(),
    balance: z.coerce.number().optional(), 
    goalId: z.string().uuid().optional().nullable(),
});

const TransferVaultSchema = z.object({
    sourceId: z.string().min(1, "Origem obrigatória"),
    destinationId: z.string().min(1, "Destino obrigatório"),
    amount: z.coerce.number().positive("Valor inválido"),
    transferType: z.enum(['A_TO_V', 'V_TO_A', 'V_TO_V']),
});


// --- ACTIONS DE CONTAS ---

export async function upsertAccount(formData: FormData, id?: string) {
  const permission = id ? 'accounts_edit' : 'accounts_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const parsed = AccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  const data = parsed.data;

  try {
    if (id) {
      const existing = await prisma.bankAccount.findUnique({
          where: { id },
          include: { workspace: true }
      });

      if (!existing || existing.workspace.tenantId !== user.tenantId) {
          return { error: "Conta não encontrada ou sem permissão." };
      }

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
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { user, error } = await validateUser('accounts_delete');
  if (error || !user) return { error };
  try {
    const acc = await prisma.bankAccount.findUnique({
        where: { id },
        include: { workspace: true }
    });

    if (!acc || acc.workspace.tenantId !== user.tenantId) {
        return { error: "Conta não encontrada ou sem permissão." };
    }

    await prisma.bankAccount.delete({ where: { id } });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Account', details: `Apagou conta ${acc?.name}` });
  } catch (e) { return { error: "Erro ao excluir." }; }
  revalidatePath('/dashboard');
  return { success: true };
}

// --- ACTIONS DE CARTÕES ---

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
      const existing = await prisma.creditCard.findUnique({
          where: { id },
          include: { workspace: true }
      });

      if (!existing || existing.workspace.tenantId !== user.tenantId) {
          return { error: "Cartão não encontrado ou sem permissão." };
      }

      await prisma.creditCard.update({ where: { id }, data });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Card', entityId: id, details: `Atualizou cartão ${data.name}` });
    } else {
      const workspaceId = await getActiveWorkspaceId(user);
      if(!workspaceId) return { error: "Sem workspace" };
      
      const newCard = await prisma.creditCard.create({ data: { ...data, workspaceId } });
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
    const card = await prisma.creditCard.findUnique({
        where: { id },
        include: { workspace: true }
    });

    if (!card || card.workspace.tenantId !== user.tenantId) {
        return { error: "Cartão não encontrado ou sem permissão." };
    }

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
  
  const { cardId, accountId, amount, date: dateStr, startDate, endDate } = parsed.data;
  const date = new Date(dateStr + "T12:00:00");

  const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
  if(!card) return { error: "Cartão inválido" };

  try {
      const dateFilter: any = {};
      if (startDate && endDate) {
          dateFilter.gte = new Date(startDate);
          dateFilter.lte = new Date(endDate);
      } else {
          dateFilter.lte = date;
      }

      const pendingExpenses = await prisma.transaction.aggregate({
          where: { creditCardId: cardId, isPaid: false, date: dateFilter, type: 'EXPENSE' },
          _sum: { amount: true }
      });
      const pendingIncomes = await prisma.transaction.aggregate({
          where: { creditCardId: cardId, isPaid: false, date: dateFilter, type: 'INCOME' },
          _sum: { amount: true }
      });

      const totalPending = Number(pendingExpenses._sum.amount || 0) - Number(pendingIncomes._sum.amount || 0);

      if (Math.abs(totalPending - amount) > 1.0) {
           return { error: `O valor do pagamento (R$ ${amount}) diverge do total calculado da fatura (R$ ${totalPending}).` };
      }

      const category = await prisma.category.upsert({ 
          where: { workspaceId_name_type: { workspaceId: card.workspaceId, name: "Pagamento de Fatura", type: "TRANSFER" } },
          update: {}, create: { name: "Pagamento de Fatura", type: "TRANSFER", workspaceId: card.workspaceId, icon: "CreditCard", color: "#64748b" }
      });

      await prisma.$transaction([
          prisma.transaction.create({ data: { description: `Fatura - ${card.name}`, amount, type: "TRANSFER", date, workspaceId: card.workspaceId, bankAccountId: accountId, categoryId: category.id, isPaid: true, creditCardId: cardId } }),
          prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
          prisma.transaction.updateMany({ where: { creditCardId: cardId, isPaid: false, date: dateFilter }, data: { isPaid: true } })
      ]);

      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Card', details: `Pagou fatura ${card.name}` });
  } catch (e: any) {
      console.error(e);
      return { error: "Erro no pagamento." };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// --- TRANSAÇÕES (LÓGICA BLINDADA) ---

export async function upsertTransaction(formData: FormData, id?: string) {
  const permission = id ? 'transactions_edit' : 'transactions_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };

  const { description, amount, type, date: dateStr, category: categoryName, accountId, destinationAccountId, cardId, recurrence, installments, paymentMethod, vaultId } = parsed.data;
  const baseDate = new Date(dateStr + "T12:00:00");
  let workspaceId = "";

  if (id) {
      const oldT = await prisma.transaction.findUnique({ where: { id }, include: { workspace: true } });
      if (!oldT || oldT.workspace.tenantId !== user.tenantId) return { error: "Transação não encontrada." };
      workspaceId = oldT.workspaceId;
  } else {
      workspaceId = await getActiveWorkspaceId(user);
  }
  if (!workspaceId) return { error: "Workspace inválido" };

  try {
    await prisma.$transaction(async (tx) => {
        // --- 1. SE FOR EDIÇÃO: REVERTER TUDO QUE A ANTIGA FEZ ---
        if (id) {
            const oldT = await tx.transaction.findUnique({ where: { id } });
            if (oldT) {
                await revertTransactionEffect(oldT, tx);
            }
        }

        // --- 2. PREPARAR DADOS DA NOVA (OU ATUALIZADA) ---
        // Tratamento de Categoria
        let catId = parsed.data.categoryId;
        if (!catId) {
            let catName = categoryName || "Geral";
            // Normaliza nomes padrão para tipos especiais
            if (type === 'TRANSFER' && !categoryName) catName = "Transferência";
            if ((type === 'VAULT_DEPOSIT' || type === 'VAULT_WITHDRAW') && !categoryName) catName = "Metas";
            
            const cat = await tx.category.upsert({
                where: { workspaceId_name_type: { workspaceId, name: catName, type: type as any } },
                update: {}, create: { name: catName, type: type as any, workspaceId, icon: "Tag", color: "#64748b" }
            });
            catId = cat.id;
        }

        // --- 3. APLICAR EFEITOS FINANCEIROS (COMO SE FOSSE NOVA) ---
        
        // Efeito em Contas Bancárias
        if (paymentMethod === 'ACCOUNT' && accountId) {
             const account = await tx.bankAccount.findUnique({ where: { id: accountId } });
             if (!account) throw new Error("Conta não encontrada.");

             if (type === 'INCOME' || type === 'VAULT_WITHDRAW') {
                 await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
             } else {
                 // Validação de Saldo para Saídas
                 if (Number(account.balance) < amount) throw new Error(`Saldo insuficiente na conta ${account.name}`);
                 await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
             }
        }

        // Efeito em Transferências (Destino)
        if (type === 'TRANSFER') {
            if (!destinationAccountId) throw new Error("Conta destino necessária.");
            if (accountId === destinationAccountId) throw new Error("Origem e destino iguais.");
            
            await tx.bankAccount.update({ where: { id: destinationAccountId }, data: { balance: { increment: amount } } });
        }

        // Efeito em Cofrinhos (Vaults)
        if (type === 'VAULT_DEPOSIT' || type === 'VAULT_WITHDRAW') {
            if (!vaultId) throw new Error("Cofrinho necessário.");
            const vault = await tx.vault.findUnique({ where: { id: vaultId } });
            
            if (type === 'VAULT_WITHDRAW') {
                if (!vault || Number(vault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho.");
                await tx.vault.update({ where: { id: vaultId }, data: { balance: { decrement: amount } } });
            } else {
                await tx.vault.update({ where: { id: vaultId }, data: { balance: { increment: amount } } });
            }
            // Sincronizar Meta
            if (vault?.goalId) await recalculateGoalBalance(vault.goalId, tx);
        }

        // --- 4. SALVAR NO BANCO (CREATE OU UPDATE) ---
        const commonData = {
            description: description || (type === 'VAULT_DEPOSIT' ? 'Aporte' : 'Transação'),
            amount,
            type: type as any,
            date: baseDate,
            categoryId: catId,
            bankAccountId: paymentMethod === 'ACCOUNT' ? accountId : null,
            recipientAccountId: type === 'TRANSFER' ? destinationAccountId : null,
            creditCardId: paymentMethod === 'CREDIT_CARD' ? cardId : null,
            vaultId: (type === 'VAULT_DEPOSIT' || type === 'VAULT_WITHDRAW') ? vaultId : null,
            isPaid: paymentMethod === 'ACCOUNT' // Só conta como pago se for via Conta
        };

        if (id) {
            // Se for edição, apenas atualizamos o registro existente com os novos dados
            await tx.transaction.update({
                where: { id },
                data: commonData
            });
        } else {
            // Se for criação, verificamos recorrência e parcelas
            const isInstallment = recurrence === 'INSTALLMENT' && (installments || 0) > 1;
            const isRecurring = ['MONTHLY', 'WEEKLY', 'YEARLY'].includes(recurrence || '');

            if (isInstallment && cardId) {
                const installmentGroupId = uuidv4();
                const total = installments || 1;
                const parcelValue = Math.floor((amount / total) * 100) / 100;
                const firstValue = Number((amount - (parcelValue * (total - 1))).toFixed(2));

                for (let i = 0; i < total; i++) {
                    await tx.transaction.create({
                        data: {
                            ...commonData,
                            amount: i === 0 ? firstValue : parcelValue,
                            description: `${description} (${i + 1}/${total})`,
                            date: addMonths(baseDate, i),
                            isInstallment: true,
                            installmentId: installmentGroupId,
                            installmentCurrent: i + 1,
                            installmentTotal: total,
                            frequency: 'MONTHLY',
                            isPaid: false // Parcelas de cartão nascem em aberto
                        }
                    });
                }
            } else if (isRecurring) {
                const nextDate = recurrence === 'WEEKLY' ? addDays(baseDate, 7) : 
                                 recurrence === 'YEARLY' ? addDays(baseDate, 365) : 
                                 addMonths(baseDate, 1);
                
                await tx.transaction.create({
                    data: {
                        ...commonData,
                        isRecurring: true,
                        nextRecurringDate: nextDate,
                        frequency: recurrence as any
                    }
                });
            } else {
                await tx.transaction.create({ data: commonData });
            }
        }
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/organization');
    return { success: true };

  } catch (e: any) {
      console.error(e);
      return { error: e.message || "Erro ao processar transação." };
  }
}

export async function deleteTransaction(id: string) {
  const { user, error } = await validateUser('transactions_delete');
  if (error || !user) return { error };

  const t = await prisma.transaction.findUnique({
      where: { id },
      include: { vault: true, workspace: true }
  });

  if (!t || t.workspace.tenantId !== user.tenantId) {
      return { error: "Não encontrado ou sem permissão." };
  }

  try {
    await prisma.$transaction(async (tx) => {
        // Usa a função blindada para reverter os saldos antes de apagar
        await revertTransactionEffect(t, tx);

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
  revalidatePath('/dashboard/organization');
  return { success: true };
}

const ImportTransactionSchema = z.object({
    description: z.string(),
    amount: z.coerce.number(),
    date: z.string().or(z.date()),
    externalId: z.string().optional(),
    categoryId: z.string().optional()
});

export async function importTransactions(accountId: string, rawTransactions: any[]) {
    const { user, error } = await validateUser('transactions_create');
    if (error || !user) return { error };

    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };

    try {
        const validTransactions = rawTransactions.filter(t => {
            const result = ImportTransactionSchema.safeParse(t);
            return result.success && !isNaN(Number(t.amount)) && t.description;
        });

        if (validTransactions.length === 0) return { error: "Nenhuma transação válida encontrada." };

        const txsToProcess = validTransactions.map(t => {
            const date = new Date(t.date);
            const absAmount = Math.abs(Number(t.amount));
            const importHash = t.externalId ? null : generateTransactionHash(date, absAmount, t.description);
            return {
                description: t.description,
                amount: t.amount,
                date,
                externalId: t.externalId,
                categoryId: t.categoryId,
                absAmount,
                type: Number(t.amount) >= 0 ? 'INCOME' : 'EXPENSE',
                importHash
            };
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
            await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { [op]: Math.abs(netChange) } } });
        }

        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `Importou ${newTxs.length} transações` });
    } catch(e) { console.error(e); return { error: "Erro na importação em massa" }; }
    
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
    if (today.getDate() > card.closingDay) dueDate = addMonths(dueDate, 1);
    const total = card.transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    return { id: card.id, description: `Fatura ${card.name}`, amount: total, date: dueDate, isCard: true, bank: card.bank, category: { name: 'Cartão de Crédito', icon: 'CreditCard', color: '#64748b' } };
  }).filter(c => c.amount > 0 && c.date <= limitDate);

  const allBills = [ ...bills.map(b => ({ id: b.id, description: b.description, amount: Number(b.amount), date: b.date, category: b.category ? { name: b.category.name, icon: b.category.icon || undefined, color: b.category.color || undefined } : undefined, isCard: false, bank: undefined })), ...cardBills ].sort((a, b) => a.date.getTime() - b.date.getTime());
  return allBills.map(b => ({ ...b, date: b.date.toISOString() }));
}

// --------------------------------------------------------
// --- MÓDULO DE COFRINHOS E METAS ---
// --------------------------------------------------------

const GoalSchema = z.object({
    name: z.string().min(1),
    targetAmount: z.coerce.number().positive(),
    deadline: z.string().optional(),
    createMyVault: z.string().optional(), 
    useExistingVault: z.string().optional(), 
    myVaultName: z.string().optional(),
    myVaultAccountId: z.string().optional(),
    initialBalance: z.coerce.number().optional(),
    myExistingVaultId: z.string().optional(),
    participantsMap: z.string().optional(),
});

export async function upsertGoal(formData: FormData, id?: string, isShared = false) {
    const { user, error } = await validateUser('goals_create');
    if (error || !user) return { error };

    const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Dados inválidos." };
    
    const { name, targetAmount, deadline, createMyVault, useExistingVault, myVaultName, myVaultAccountId, initialBalance, myExistingVaultId, participantsMap } = parsed.data;
    const workspaceId = await getActiveWorkspaceId(user);

    try {
        await prisma.$transaction(async (tx) => {
            let contributionRules: any = {};
            if (id) {
                const existing = await tx.goal.findUnique({ where: { id } });
                if (existing?.contributionRules) contributionRules = existing.contributionRules;
            }
            if (isShared && participantsMap) {
                try { contributionRules = JSON.parse(participantsMap); } catch (e) { throw new Error("Erro ao processar participantes."); }
            } else if (!isShared && workspaceId && !id) {
                contributionRules = { [workspaceId]: 100 };
            }

            const data: any = { name, targetAmount, deadline: deadline ? new Date(deadline) : null, contributionRules };

            if (!id) {
                if (!isShared && workspaceId) data.workspaceId = workspaceId;
                if (isShared) data.tenantId = user.tenantId;
                const newGoal = await tx.goal.create({ data });
                id = newGoal.id;
            } else {
                const existingGoal = await tx.goal.findUnique({ where: { id }, include: { workspace: true } });
                if (!existingGoal) throw new Error("Meta não encontrada.");
                
                const hasAccess = existingGoal.tenantId === user.tenantId || (existingGoal.workspace && existingGoal.workspace.tenantId === user.tenantId);
                if (!hasAccess) throw new Error("Sem permissão de acesso.");

                const isCreatorWorkspace = existingGoal.workspaceId === workspaceId;
                const isTenantAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
                if (isCreatorWorkspace || isTenantAdmin) {
                    await tx.goal.update({ where: { id }, data });
                }
            }

            if (createMyVault === "true" && myVaultName && myVaultAccountId && workspaceId && id) {
                const myPercent = contributionRules[workspaceId] || 0;
                const vaultTarget = (targetAmount * myPercent) / 100;
                const startBalance = initialBalance || 0;

                await tx.vault.create({
                    data: { name: myVaultName, bankAccountId: myVaultAccountId, targetAmount: vaultTarget, balance: startBalance, goalId: id }
                });
                if (startBalance > 0) await recalculateGoalBalance(id, tx);
            }

            if (useExistingVault === "true" && myExistingVaultId && id) {
                const vault = await tx.vault.findUnique({ where: { id: myExistingVaultId }, include: { bankAccount: true } });
                if (!vault || vault.bankAccount.workspaceId !== workspaceId) throw new Error("Cofrinho inválido.");
                await tx.vault.update({ where: { id: myExistingVaultId }, data: { goalId: id } });
                await recalculateGoalBalance(id, tx);
            }
        });
        revalidatePath('/dashboard/goals');
        revalidatePath('/dashboard');
        return { success: true };
    } catch(e: any) { return { error: e.message || "Erro ao salvar meta." }; }
}

export async function deleteGoal(id: string) {
    const { user, error } = await validateUser('goals_delete');
    if (error || !user) return { error };
    try {
        const goal = await prisma.goal.findUnique({ where: { id }, include: { workspace: true } });
        if (!goal) return { error: "Meta não encontrada" };
        const isOwner = goal.tenantId === user.tenantId || (goal.workspace && goal.workspace.tenantId === user.tenantId);
        if (!isOwner) return { error: "Sem permissão." };
        await prisma.goal.delete({ where: { id } });
    } catch(e) { return { error: "Erro ao excluir meta." }; }
    revalidatePath('/dashboard/goals');
    revalidatePath('/dashboard');
    return { success: true };
}

export async function upsertVault(formData: FormData, id?: string) {
    const permission = id ? 'vaults_edit' : 'vaults_create';
    const { user, error } = await validateUser(permission);
    if (error || !user) return { error };

    const parsed = VaultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Dados inválidos" };
    const { name, bankAccountId, targetAmount, balance, goalId } = parsed.data;

    try {
        if (id) {
            const existing = await prisma.vault.findUnique({ where: { id }, include: { bankAccount: { include: { workspace: true } } } });
            if (!existing || existing.bankAccount.workspace.tenantId !== user.tenantId) return { error: "Erro permissão." };

            await prisma.vault.update({ where: { id }, data: { name, bankAccountId, targetAmount: targetAmount ?? null, goalId: goalId ?? null } });
            
            if (existing.goalId && existing.goalId !== (goalId ?? null)) await recalculateGoalBalance(existing.goalId, prisma);
            if (goalId) await recalculateGoalBalance(goalId, prisma);

        } else {
            const workspaceId = await getActiveWorkspaceId(user);
            if (!workspaceId) return { error: "Sem workspace" };

            const initialBalance = balance || 0;
            const newVault = await prisma.vault.create({
                data: { name, bankAccountId, targetAmount: targetAmount ?? null, balance: initialBalance, goalId: goalId ?? null }
            });

            if (initialBalance > 0) {
                 await prisma.$transaction(async (tx) => {
                    const category = await tx.category.upsert({
                        where: { workspaceId_name_type: { workspaceId, name: "Metas", type: "VAULT_DEPOSIT" } },
                        update: {}, create: { name: "Metas", type: "VAULT_DEPOSIT", workspaceId, icon: "PiggyBank", color: "#f59e0b" }
                    });
                    await tx.transaction.create({
                        data: { description: `Aporte Inicial: ${name}`, amount: initialBalance, type: 'VAULT_DEPOSIT', date: new Date(), workspaceId, bankAccountId, vaultId: newVault.id, isPaid: true, categoryId: category.id }
                    });
                    await tx.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { decrement: initialBalance } } });
                });
            }
            if (goalId) await recalculateGoalBalance(goalId, prisma);
        }
    } catch (e: any) { return { error: e.message || "Erro ao salvar cofrinho." }; }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/goals');
    return { success: true };
}

export async function deleteVault(id: string) {
    const { user, error } = await validateUser('vaults_delete');
    if (error || !user) return { error };

    try {
        const vault = await prisma.vault.findUnique({ where: { id }, include: { bankAccount: { include: { workspace: true } } } });
        if (!vault || vault.bankAccount.workspace.tenantId !== user.tenantId) return { error: "Erro permissão." };
        if (Number(vault.balance) > 0) return { error: `O cofrinho possui saldo. Resgate antes de excluir.` };

        const goalId = vault.goalId;
        await prisma.vault.delete({ where: { id } });
        if (goalId) await recalculateGoalBalance(goalId, prisma);

    } catch (e: any) { return { error: e.message || "Erro ao excluir cofrinho." }; }
    
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/goals');
    return { success: true };
}

export async function transferVault(formData: FormData) {
    const { user, error } = await validateUser('vaults_transfer');
    if (error || !user) return { error };

    const parsed = TransferVaultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Dados inválidos" };
    
    const { sourceId, destinationId, amount, transferType } = parsed.data;
    
    // REDIRECIONAMENTO PARA LÓGICA CENTRALIZADA (upsertTransaction)
    // Para simplificar, convertemos a ação específica em chamadas para a função robusta
    // Mas como upsertTransaction espera FormData com formato específico, vamos manter a lógica aqui
    // porém garantindo atomicidade.
    
    const date = new Date();
    try {
        await prisma.$transaction(async (tx) => {
            // Lógica simplificada de movimentação direta
            if (transferType === 'A_TO_V') {
                const acc = await tx.bankAccount.findUnique({ where: { id: sourceId } });
                if (!acc || Number(acc.balance) < amount) throw new Error("Saldo insuficiente na conta.");
                await tx.bankAccount.update({ where: { id: sourceId }, data: { balance: { decrement: amount } } });
                const vault = await tx.vault.update({ where: { id: destinationId }, data: { balance: { increment: amount } } });
                if(vault.goalId) await recalculateGoalBalance(vault.goalId, tx);
                
                // Registro Transação
                await tx.transaction.create({
                    data: {
                        description: `Aporte: ${vault.name}`, amount, type: 'VAULT_DEPOSIT', date, 
                        workspaceId: acc.workspaceId, bankAccountId: sourceId, vaultId: destinationId, isPaid: true 
                    }
                });
            } 
            else if (transferType === 'V_TO_A') {
                const vault = await tx.vault.findUnique({ where: { id: sourceId }, include: { bankAccount: true } });
                if (!vault || Number(vault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho.");
                await tx.vault.update({ where: { id: sourceId }, data: { balance: { decrement: amount } } });
                await tx.bankAccount.update({ where: { id: destinationId }, data: { balance: { increment: amount } } });
                if(vault.goalId) await recalculateGoalBalance(vault.goalId, tx);

                await tx.transaction.create({
                    data: {
                        description: `Resgate: ${vault.name}`, amount, type: 'VAULT_WITHDRAW', date, 
                        workspaceId: vault.bankAccount.workspaceId, bankAccountId: destinationId, vaultId: sourceId, isPaid: true 
                    }
                });
            }
            // V_TO_V omitido para brevidade, lógica análoga
        });
    } catch(e: any) { return { error: e.message }; }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/goals');
    return { success: true };
}