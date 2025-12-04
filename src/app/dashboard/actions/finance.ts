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
// tx type inferido ou Prisma.TransactionClient se importado
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
      // SEGURANÇA: Verificar se a conta pertence ao tenant
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
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { user, error } = await validateUser('accounts_delete');
  if (error || !user) return { error };
  try {
    // SEGURANÇA: Verificar propriedade
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
      // SEGURANÇA: Verificar propriedade
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
    // SEGURANÇA: Verificar propriedade
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

// --- TRANSAÇÕES ---

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
      const oldT = await prisma.transaction.findUnique({
          where: { id },
          include: { workspace: true }
      });

      // SEGURANÇA: Verificar tenantId
      if (!oldT || oldT.workspace.tenantId !== user.tenantId) {
          return { error: "Transação não encontrada ou sem permissão." };
      }

      workspaceId = oldT.workspaceId;
  } else {
      workspaceId = await getActiveWorkspaceId(user);
  }
  if (!workspaceId) return { error: "Workspace inválido" };


  // --- TIPO 1: APORTES/RESGATES EM COFRINHOS (DESCENTRALIZADO) ---
  if (type === 'VAULT_DEPOSIT' || type === 'VAULT_WITHDRAW') {
      if (!vaultId) return { error: "Selecione um cofrinho." };

      try {
        await prisma.$transaction(async (tx) => {
            const vault = await tx.vault.findUnique({ where: { id: vaultId }, include: { bankAccount: true, goal: true } });
            if (!vault) throw new Error("Cofrinho não encontrado.");

            const isDeposit = type === 'VAULT_DEPOSIT';
            
            if (isDeposit) {
                if (Number(vault.bankAccount.balance) < amount) throw new Error("Saldo insuficiente na conta corrente.");
            } else {
                if (Number(vault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho.");
            }

            const accountOp = isDeposit ? 'decrement' : 'increment';
            await tx.bankAccount.update({ where: { id: vault.bankAccountId }, data: { balance: { [accountOp]: amount } } });

            const vaultOp = isDeposit ? 'increment' : 'decrement';
            const updatedVault = await tx.vault.update({ where: { id: vaultId }, data: { balance: { [vaultOp]: amount } } });

            // Sincroniza a meta SE houver (agora baseado em soma)
            if (updatedVault.goalId) {
                await recalculateGoalBalance(updatedVault.goalId, tx);
            }

            // CORREÇÃO: Usar o tipo real (VAULT_DEPOSIT ou VAULT_WITHDRAW) na categoria
            const catType = type;
            const category = await tx.category.upsert({
                where: { workspaceId_name_type: { workspaceId: vault.bankAccount.workspaceId, name: "Metas", type: catType } },
                update: {},
                create: { name: "Metas", type: catType, workspaceId: vault.bankAccount.workspaceId, icon: "PiggyBank", color: "#f59e0b" }
            });

            if (id) {
                await tx.transaction.update({ where: { id }, data: { description, date: baseDate } });
            } else {
                await tx.transaction.create({
                    data: {
                        description: description || (isDeposit ? `Aporte: ${vault.name}` : `Resgate: ${vault.name}`),
                        amount,
                        type,
                        date: baseDate,
                        workspaceId: vault.bankAccount.workspaceId,
                        bankAccountId: vault.bankAccountId,
                        vaultId: vault.id,
                        isPaid: true,
                        categoryId: category.id
                    }
                });
            }
        });
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/goals');
        return { success: true };
      } catch (e: any) {
          return { error: e.message || "Erro na movimentação de meta." };
      }
  }

  // --- TIPO 2: TRANSFERÊNCIA ---
  if (type === 'TRANSFER') {
      if (!accountId || !destinationAccountId) return { error: "Selecione as contas." };
      if (accountId === destinationAccountId) return { error: "As contas devem ser diferentes." };

      try {
          await prisma.$transaction(async (tx) => {
              const sourceAcc = await tx.bankAccount.findUnique({ where: { id: accountId } });
              const destAcc = await tx.bankAccount.findUnique({ where: { id: destinationAccountId } });

              if (!sourceAcc || !destAcc) throw new Error("Contas não encontradas.");

              const category = await tx.category.upsert({
                  where: { workspaceId_name_type: { workspaceId, name: "Transferência", type: "TRANSFER" } },
                  update: {},
                  create: { name: "Transferência", type: "TRANSFER", workspaceId, icon: "ArrowRightLeft", color: "#64748b" }
              });

              await tx.transaction.create({
                  data: {
                      description: `Transferência: ${sourceAcc.name} > ${destAcc.name}`,
                      amount, 
                      type: 'TRANSFER', 
                      date: baseDate, 
                      workspaceId, 
                      bankAccountId: accountId, 
                      recipientAccountId: destinationAccountId, 
                      isPaid: true,
                      categoryId: category.id
                  }
              });

              await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
              await tx.bankAccount.update({ where: { id: destinationAccountId }, data: { balance: { increment: amount } } });
          });
          revalidatePath('/dashboard');
          return { success: true };
      } catch (e) { return { error: "Erro na transferência." }; }
  }

  // --- TIPO 3 & 4: RECEITAS E DESPESAS ---
  
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

  if (id) {
      try {
          await prisma.$transaction(async (tx) => {
              const oldT = await tx.transaction.findUnique({ where: { id } });
              if (!oldT) throw new Error("Transação original não encontrada");

              // TRAVA DE SEGURANÇA: Bloquear edição de valor/tipo em Transferências e Aportes
              // Motivo: A lógica de reversão de saldo para múltiplas contas (ou conta+cofrinho) é complexa e propensa a erros
              // se feita via edição simples. É mais seguro forçar a recriação.
              const isComplexTransaction =
                  oldT.type === 'TRANSFER' ||
                  oldT.type === 'VAULT_DEPOSIT' ||
                  oldT.type === 'VAULT_WITHDRAW' ||
                  oldT.recipientAccountId ||
                  oldT.vaultId;

              if (isComplexTransaction) {
                  // Se tentar mudar o valor ou o tipo...
                  if (amount !== Number(oldT.amount) || type !== oldT.type) {
                       throw new Error("Para alterar o valor ou tipo de Transferências ou Investimentos, por favor exclua a transação e crie novamente para garantir a integridade dos saldos.");
                  }
                  // Permitir apenas alteração de data, descrição e categoria (se não afetar lógica financeira)
              }

              await tx.transaction.update({ 
                  where: { id }, 
                  data: { description, date: baseDate, categoryId: catId }
              });

              // Atualização de saldo APENAS para Income/Expense simples
              if (!isComplexTransaction && oldT.isPaid && oldT.bankAccountId) {
                  const diff = amount - Number(oldT.amount);
                  if (diff !== 0) {
                      // Atualiza a transação com o novo valor também (pois não foi bloqueado acima)
                      await tx.transaction.update({ where: { id }, data: { amount } });

                      if (oldT.type === 'INCOME') {
                          await tx.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { increment: diff } } });
                      } else if (oldT.type === 'EXPENSE') {
                          await tx.bankAccount.update({ where: { id: oldT.bankAccountId }, data: { balance: { decrement: diff } } });
                      }
                  }
              }
          });
          return { success: true };
      } catch (e: any) { return { error: e.message || "Erro ao atualizar transação." }; }
  }

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

  // SEGURANÇA: Include workspace para checar tenant
  const t = await prisma.transaction.findUnique({
      where: { id },
      include: { vault: true, workspace: true }
  });

  if (!t || t.workspace.tenantId !== user.tenantId) {
      return { error: "Não encontrado ou sem permissão." };
  }

  try {
    await prisma.$transaction(async (tx) => {
        if (t.isPaid && t.bankAccountId) {
            if (t.type === 'INCOME') {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { decrement: t.amount } } });
            } else if (t.type === 'EXPENSE') {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
            } else if (t.type === 'TRANSFER' && t.recipientAccountId) {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
            } else if (t.type === 'VAULT_DEPOSIT') {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
            } else if (t.type === 'VAULT_WITHDRAW') {
                await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { decrement: t.amount } } });
            }
        }

        if (t.isPaid && t.recipientAccountId && t.type === 'TRANSFER') {
            await tx.bankAccount.update({ where: { id: t.recipientAccountId }, data: { balance: { decrement: t.amount } } });
        }

        if (t.isPaid && t.vaultId) {
            const vault = await tx.vault.findUnique({ where: { id: t.vaultId } });
            if(vault) {
                if (t.type === 'VAULT_DEPOSIT') {
                    // VERIFICAÇÃO DE SALDO: Impedir saldo negativo
                    if (Number(vault.balance) < Number(t.amount)) {
                        throw new Error(`Não é possível excluir este aporte pois o valor já foi utilizado. Saldo atual do cofrinho: R$ ${Number(vault.balance).toFixed(2)}`);
                    }
                    await tx.vault.update({ where: { id: t.vaultId }, data: { balance: { decrement: t.amount } } });
                } else if (t.type === 'VAULT_WITHDRAW') {
                    await tx.vault.update({ where: { id: t.vaultId }, data: { balance: { increment: t.amount } } });
                }
                
                if (vault.goalId) {
                    await recalculateGoalBalance(vault.goalId, tx);
                }
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
        // Validação com Zod
        const validTransactions = rawTransactions
            .filter(t => {
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

const GoalSchema = z.object({
    name: z.string().min(1),
    targetAmount: z.coerce.number().positive(),
    deadline: z.string().optional(),
    
    // Configurações de Cofrinho
    createMyVault: z.string().optional(), // "true" (criar) | "false" (não criar ou usar existente)
    useExistingVault: z.string().optional(), // "true" se for usar existente
    
    // Dados para Novo Cofrinho
    myVaultName: z.string().optional(),
    myVaultAccountId: z.string().optional(),
    initialBalance: z.coerce.number().optional(),
    
    // Dados para Cofrinho Existente
    myExistingVaultId: z.string().optional(),

    // Regras
    mySharePercentage: z.coerce.number().optional(),
    participantsMap: z.string().optional(),
});

export async function upsertGoal(formData: FormData, id?: string, isShared = false) {
    const { user, error } = await validateUser('goals_create');
    if (error || !user) return { error };

    const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Dados inválidos." };
    
    const { 
        name, targetAmount, deadline, 
        createMyVault, useExistingVault,
        myVaultName, myVaultAccountId, initialBalance, myExistingVaultId,
        participantsMap 
    } = parsed.data;
    
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

            const data: any = {
                name,
                targetAmount,
                deadline: deadline ? new Date(deadline) : null,
                contributionRules
            };

            if (!id) {
                if (!isShared && workspaceId) data.workspaceId = workspaceId;
                if (isShared) data.tenantId = user.tenantId;
                const newGoal = await tx.goal.create({ data });
                id = newGoal.id;
            } else {
                // SEGURANÇA
                const existingGoal = await tx.goal.findUnique({
                    where: { id },
                    include: { workspace: true }
                });

                if (!existingGoal) throw new Error("Meta não encontrada.");

                // Verifica permissões
                // 1. Acesso Básico (Ver/Participar): Deve ser do mesmo Tenant
                const hasAccess = existingGoal.tenantId === user.tenantId ||
                                 (existingGoal.workspace && existingGoal.workspace.tenantId === user.tenantId);

                if (!hasAccess) throw new Error("Sem permissão de acesso.");

                // 2. Permissão de Edição (Alterar Nome/Valor):
                //    - Se for meta pessoal: Deve ser dono do workspace.
                //    - Se for meta compartilhada: Deve ser Admin do Tenant ou dono do workspace criador (se houver).
                //    - Simplificação: Se o usuário tiver role ADMIN/OWNER no Tenant OU for membro do workspace criador com role ADMIN.

                // Vamos simplificar: Se o workspaceId do usuário atual bater com o da meta, ou se ele for ADMIN do tenant.
                const isCreatorWorkspace = existingGoal.workspaceId === workspaceId;
                const isTenantAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
                const canEditDetails = isCreatorWorkspace || isTenantAdmin;

                // Se tiver permissão, atualiza os dados da meta.
                // Se não tiver (é apenas um participante vinculando cofrinho), PULA a atualização da meta para não sobrescrever dados.
                if (canEditDetails) {
                    await tx.goal.update({ where: { id }, data });
                }
            }

            // Cenário A: Criar Novo Cofrinho
            if (createMyVault === "true" && myVaultName && myVaultAccountId && workspaceId && id) {
                const myPercent = contributionRules[workspaceId] || 0;
                const vaultTarget = (targetAmount * myPercent) / 100;
                const startBalance = initialBalance || 0;

                await tx.vault.create({
                    data: {
                        name: myVaultName,
                        bankAccountId: myVaultAccountId,
                        targetAmount: vaultTarget,
                        balance: startBalance,
                        goalId: id
                    }
                });
                
                if (startBalance > 0) await recalculateGoalBalance(id, tx);
            }

            // Cenário B: Vincular Cofrinho Existente
            if (useExistingVault === "true" && myExistingVaultId && id) {
                // Verifica se o cofrinho pertence ao workspace do usuário (segurança)
                const vault = await tx.vault.findUnique({ where: { id: myExistingVaultId }, include: { bankAccount: true } });
                
                if (!vault) throw new Error("Cofrinho existente não encontrado.");
                if (vault.bankAccount.workspaceId !== workspaceId) throw new Error("Este cofrinho não pertence ao seu workspace.");

                // Atualiza o cofrinho para apontar para esta meta
                await tx.vault.update({
                    where: { id: myExistingVaultId },
                    data: { goalId: id }
                });

                // Recalcula saldo da meta (pois o cofrinho pode ter saldo)
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
        // SEGURANÇA
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

// --------------------------------------------------------
// --- MÓDULO DE COFRINHOS (ACTIONS DEDICADAS) ---
// --------------------------------------------------------

export async function upsertVault(formData: FormData, id?: string) {
    const permission = id ? 'vaults_edit' : 'vaults_create';
    const { user, error } = await validateUser(permission);
    if (error || !user) return { error };

    const parsed = VaultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Dados inválidos" };
    const { name, bankAccountId, targetAmount, balance, goalId } = parsed.data;

    try {
        if (id) {
            // SEGURANÇA: Verificar propriedade
            const existing = await prisma.vault.findUnique({
                where: { id },
                include: { bankAccount: { include: { workspace: true } } }
            });

            if (!existing || existing.bankAccount.workspace.tenantId !== user.tenantId) {
                return { error: "Cofrinho não encontrado ou sem permissão." };
            }

            const data = { name, bankAccountId, targetAmount: targetAmount ?? null, goalId: goalId ?? null };
            await prisma.vault.update({ where: { id }, data });
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Vault', entityId: id, details: `Editou cofrinho ${name}` });
            
            // Se o goalId mudou, recalcular o saldo da meta anterior e da nova
            if (existing.goalId && existing.goalId !== (goalId ?? null)) {
                await recalculateGoalBalance(existing.goalId, prisma);
            }
            if (goalId) {
                await recalculateGoalBalance(goalId, prisma);
            }

        } else {
            const workspaceId = await getActiveWorkspaceId(user);
            if (!workspaceId) return { error: "Sem workspace" };

            // Verifica se a conta pertence ao workspace
            const account = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
            if (!account || account.workspaceId !== workspaceId) return { error: "Conta inválida para este workspace." };
            
            const initialBalance = balance || 0;

            const newVault = await prisma.vault.create({
                data: {
                    name,
                    bankAccountId,
                    targetAmount: targetAmount ?? null,
                    balance: initialBalance,
                    goalId: goalId ?? null,
                }
            });

            // Se houver saldo inicial, deve criar uma transação de aporte e atualizar o saldo da conta.
            if (initialBalance > 0) {
                 await prisma.$transaction(async (tx) => {
                    const category = await tx.category.upsert({
                        where: { workspaceId_name_type: { workspaceId, name: "Metas", type: "VAULT_DEPOSIT" } },
                        update: {},
                        create: { name: "Metas", type: "VAULT_DEPOSIT", workspaceId, icon: "PiggyBank", color: "#f59e0b" }
                    });

                    // Cria a transação (Aporte Inicial)
                    await tx.transaction.create({
                        data: {
                            description: `Aporte Inicial: ${name}`,
                            amount: initialBalance,
                            type: 'VAULT_DEPOSIT',
                            date: new Date(),
                            workspaceId,
                            bankAccountId,
                            vaultId: newVault.id,
                            isPaid: true,
                            categoryId: category.id
                        }
                    });
                    
                    // Atualiza saldo da conta
                    await tx.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { decrement: initialBalance } } });
                });
            }

            // Recalcula saldo total da meta (se houver)
            if (goalId) await recalculateGoalBalance(goalId, prisma);
            
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Vault', entityId: newVault.id, details: `Criou cofrinho ${name}` });
        }
    } catch (e: any) { 
        console.error(e);
        return { error: e.message || "Erro ao salvar cofrinho." }; 
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/goals');
    return { success: true };
}

export async function deleteVault(id: string) {
    const { user, error } = await validateUser('vaults_delete');
    if (error || !user) return { error };

    try {
        const vault = await prisma.vault.findUnique({
            where: { id },
            include: { bankAccount: { include: { workspace: true } } }
        });

        if (!vault || vault.bankAccount.workspace.tenantId !== user.tenantId) {
            return { error: "Cofrinho não encontrado ou sem permissão." };
        }

        // Se houver saldo, o sistema deve forçar o resgate para a conta antes de apagar.
        if (Number(vault.balance) > 0) {
            return { error: `O cofrinho possui saldo de R$ ${Number(vault.balance).toFixed(2)}. Transfira ou resgate o valor antes de excluir.` };
        }

        const goalId = vault.goalId;

        await prisma.vault.delete({ where: { id } });
        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Vault', details: `Apagou cofrinho ${vault.name}` });
        
        // Recalcula saldo total da meta (se houver e o cofrinho tinha saldo 0)
        if (goalId) await recalculateGoalBalance(goalId, prisma);

    } catch (e: any) { 
        return { error: e.message || "Erro ao excluir cofrinho." }; 
    }
    
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
    const date = new Date();
    const isAToV = transferType === 'A_TO_V';
    const isVToA = transferType === 'V_TO_A';
    const isVToV = transferType === 'V_TO_V';

    let sourceName = "";
    let destinationName = "";
    let workspaceId = "";

    try {
        await prisma.$transaction(async (tx) => {
            if (isAToV || isVToA) {
                const accountId = isAToV ? sourceId : destinationId;
                const vaultId = isAToV ? destinationId : sourceId;
                
                const account = await tx.bankAccount.findUnique({ where: { id: accountId } });
                const vault = await tx.vault.findUnique({ where: { id: vaultId }, include: { bankAccount: true, goal: true } });
                
                if (!account || !vault) throw new Error("Conta ou Cofrinho não encontrado.");
                if (account.workspaceId !== vault.bankAccount.workspaceId) throw new Error("Recursos de workspaces diferentes.");
                workspaceId = account.workspaceId;

                sourceName = isAToV ? account.name : vault.name;
                destinationName = isAToV ? vault.name : account.name;

                // Check Balance
                if (isVToA && Number(vault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho de origem.");
                if (isAToV && Number(account.balance) < amount) throw new Error("Saldo insuficiente na conta de origem.");

                const accountOp = isAToV ? 'decrement' : 'increment';
                const vaultOp = isAToV ? 'increment' : 'decrement';
                const type = isAToV ? 'VAULT_DEPOSIT' : 'VAULT_WITHDRAW';
                const descriptionPrefix = isAToV ? 'Aporte via Transf.' : 'Resgate via Transf.';

                await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { [accountOp]: amount } } });
                const updatedVault = await tx.vault.update({ where: { id: vaultId }, data: { balance: { [vaultOp]: amount } } });
                
                if (updatedVault.goalId) await recalculateGoalBalance(updatedVault.goalId, tx);


                const category = await tx.category.upsert({
                    where: { workspaceId_name_type: { workspaceId, name: "Metas", type } },
                    update: {},
                    create: { name: "Metas", type, workspaceId, icon: "PiggyBank", color: "#f59e0b" }
                });

                await tx.transaction.create({
                    data: {
                        description: `${descriptionPrefix}: ${sourceName} > ${destinationName}`,
                        amount, type, date, workspaceId, 
                        bankAccountId: accountId, vaultId, 
                        isPaid: true, categoryId: category.id
                    }
                });
            } 
            
            else if (isVToV) {
                const sourceVault = await tx.vault.findUnique({ where: { id: sourceId }, include: { bankAccount: true, goal: true } });
                const destinationVault = await tx.vault.findUnique({ where: { id: destinationId }, include: { bankAccount: true, goal: true } });

                if (!sourceVault || !destinationVault) throw new Error("Cofrinho(s) não encontrado(s).");
                if (sourceVault.bankAccount.workspaceId !== destinationVault.bankAccount.workspaceId) throw new Error("Cofrinhos de workspaces diferentes.");
                workspaceId = sourceVault.bankAccount.workspaceId;

                sourceName = sourceVault.name;
                destinationName = destinationVault.name;

                // Check Balance
                if (Number(sourceVault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho de origem.");

                // Debit source vault & Credit destination vault
                await tx.vault.update({ where: { id: sourceId }, data: { balance: { decrement: amount } } });
                await tx.vault.update({ where: { id: destinationId }, data: { balance: { increment: amount } } });
                
                // Recalculate balances for both goals if they exist
                if (sourceVault.goalId) await recalculateGoalBalance(sourceVault.goalId, tx);
                if (destinationVault.goalId) await recalculateGoalBalance(destinationVault.goalId, tx);


                if (sourceVault.bankAccountId !== destinationVault.bankAccountId) {
                     // Movimento de conta é necessário
                     const transferCat = await tx.category.upsert({
                        where: { workspaceId_name_type: { workspaceId, name: "Transferência Cofrinho", type: "TRANSFER" } },
                        update: {},
                        create: { name: "Transferência Cofrinho", type: "TRANSFER", workspaceId, icon: "ArrowRightLeft", color: "#64748b" }
                    });

                    // Debit Source Account
                    await tx.bankAccount.update({ where: { id: sourceVault.bankAccountId }, data: { balance: { decrement: amount } } });
                    // Credit Destination Account
                    await tx.bankAccount.update({ where: { id: destinationVault.bankAccountId }, data: { balance: { increment: amount } } });

                    // Create transaction for reconciliation
                    await tx.transaction.create({
                        data: {
                            description: `Transf. entre Cofrinhos: ${sourceName} > ${destinationName}`,
                            amount, type: 'TRANSFER', date, workspaceId, 
                            bankAccountId: sourceVault.bankAccountId, 
                            recipientAccountId: destinationVault.bankAccountId,
                            isPaid: true, categoryId: transferCat.id
                            // Não vamos atribuir vaultId/destinationVaultId na Transaction entity, pois é uma transferência de conta.
                        }
                    });

                } else {
                    // Mesma conta bancária, apenas o movimento entre cofrinhos é registrado
                    const vaultTransferCat = await tx.category.upsert({
                        where: { workspaceId_name_type: { workspaceId, name: "Transf. Cofrinho (Interna)", type: "TRANSFER" } },
                        update: {},
                        create: { name: "Transf. Cofrinho (Interna)", type: "TRANSFER", workspaceId, icon: "ArrowRightLeft", color: "#64748b" }
                    });
                    
                    // Cria uma transação para registrar o movimento interno
                    await tx.transaction.create({
                        data: {
                            description: `Transf. Cofrinhos (Interna): ${sourceName} > ${destinationName}`,
                            amount, type: 'TRANSFER', date, workspaceId, 
                            bankAccountId: sourceVault.bankAccountId, 
                            recipientAccountId: sourceVault.bankAccountId, // Transferência de conta para a própria conta
                            isPaid: true, categoryId: vaultTransferCat.id,
                            vaultId: sourceVault.id,
                        }
                    });
                }
            } else {
                 throw new Error("Tipo de transferência não suportado ou IDs ausentes.");
            }
        });
        
        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Vault', details: `Transferiu R$ ${amount} de ${sourceName} para ${destinationName}` });

    } catch(e: any) { 
        return { error: e.message || "Erro na transferência." }; 
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/goals');
    return { success: true };
}