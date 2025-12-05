'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { notifyInvoiceDue } from "@/lib/notifications"; 
import { z } from "zod";

// --- HELPERS ---
async function recalculateGoalBalance(goalId: string, tx: any) {
    if (!goalId) return;
    const aggregator = await tx.vault.aggregate({
        where: { goalId },
        _sum: { balance: true }
    });
    const total = Number(aggregator._sum.balance || 0);
    await tx.goal.update({ where: { id: goalId }, data: { currentAmount: total } });
}

// --- SCHEMAS ---
const BudgetSchema = z.object({
    amount: z.coerce.number().min(0, "Valor inválido"),
    categoryId: z.string().optional()
});

const GoalSchema = z.object({
    name: z.string().min(1, "Nome obrigatório"),
    targetAmount: z.coerce.number().min(0),
    deadline: z.string().optional().nullable(),
    currentAmount: z.coerce.number().optional(), // Mantido no schema para compatibilidade de form, mas ignorado na lógica direta
    contributionRules: z.string().optional(),
    linkedAccountId: z.string().optional().nullable(),
    // Campos para criação automática de cofrinho
    createMyVault: z.string().optional(),
    myVaultName: z.string().optional(),
    myVaultAccountId: z.string().optional(),
    initialBalance: z.coerce.number().optional(),
    useExistingVault: z.string().optional(),
    myExistingVaultId: z.string().optional(),
    participantsMap: z.string().optional(),
});

// === ORÇAMENTOS ===
export async function upsertBudget(formData: FormData, id?: string) {
  const permission = id ? 'budgets_edit' : 'budgets_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const parsed = BudgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };

  const { amount, categoryId } = parsed.data;

  if (id) {
    await prisma.budget.update({ where: { id }, data: { targetAmount: amount } });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Budget', entityId: id, details: `Atualizou orçamento para R$ ${amount}` });
  } else {
    const workspaceId = await getActiveWorkspaceId(user);
    if (!workspaceId) return { error: "Sem workspace" };
    if (!categoryId) return { error: "Categoria necessária" };
    
    const budget = await prisma.budget.create({ data: { name: "Orçamento", targetAmount: amount, workspaceId, categoryId } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Budget', entityId: budget.id, details: `Criou orçamento de R$ ${amount}` });
  }
  
  revalidatePath('/dashboard/budgets');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function deleteBudget(id: string) {
  const { user, error } = await validateUser('budgets_delete');
  if (error || !user) return { error };
  
  await prisma.budget.delete({ where: { id } });
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Budget', details: "Removeu orçamento" });
  
  revalidatePath('/dashboard/budgets');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

// === METAS (GOALS) - REFORMULADO ===
export async function upsertGoal(formData: FormData, id?: string, isShared = false) {
  const { user, error } = await validateUser(isShared ? 'org_view' : undefined);
  if (error || !user) return { error };

  const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  
  const { 
      name, targetAmount, deadline, 
      contributionRules: rulesString, linkedAccountId,
      createMyVault, myVaultName, myVaultAccountId, initialBalance,
      useExistingVault, myExistingVaultId, participantsMap
  } = parsed.data;

  const workspaceId = await getActiveWorkspaceId(user);

  try {
    await prisma.$transaction(async (tx) => {
        let contributionRules: any = {};
        
        // Recupera regras existentes se for edição
        if (id) {
            const existing = await tx.goal.findUnique({ where: { id } });
            if (existing?.contributionRules) contributionRules = existing.contributionRules;
        }

        // Processa novas regras
        if (isShared && participantsMap) {
            try { contributionRules = JSON.parse(participantsMap); } catch (e) {}
        } else if (!isShared && workspaceId && !id) {
            contributionRules = { [workspaceId]: 100 };
        }

        const data: any = {
            name,
            targetAmount,
            deadline: deadline ? new Date(deadline) : null,
            contributionRules,
            linkedAccountId: linkedAccountId === "none" ? null : linkedAccountId
        };

        // --- MUDANÇA: currentAmount não é mais definido manualmente aqui ---
        // Ele será calculado apenas pelos cofrinhos.

        if (id) {
            await tx.goal.update({ where: { id }, data });
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Goal', entityId: id, details: `Atualizou meta ${data.name}` });
        } else {
            // Criação
            let goalData: any = { 
                ...data,
                currentAmount: 0 // Começa zerado, pois depende de cofrinhos
            };
            
            if (isShared) {
                goalData.tenantId = user.tenantId;
            } else {
                if (!workspaceId) throw new Error("Sem workspace");
                goalData.workspaceId = workspaceId;
            }

            const goal = await tx.goal.create({ data: goalData });
            id = goal.id;
            
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Goal', entityId: goal.id, details: `Criou meta ${data.name}` });
        }

        // --- LÓGICA DE COFRINHOS (NOVO PADRÃO) ---
        
        // 1. Criar Novo Cofrinho (se solicitado)
        if (createMyVault === "true" && myVaultName && myVaultAccountId && workspaceId && id) {
            const startBalance = initialBalance || 0;
            
            // Cria o cofrinho
            const newVault = await tx.vault.create({
                data: {
                    name: myVaultName,
                    bankAccountId: myVaultAccountId,
                    targetAmount: targetAmount, // Simplificação: assume meta total
                    balance: startBalance,
                    goalId: id
                }
            });

            // Se houver saldo inicial, deve-se debitar da conta e registrar transação
            if (startBalance > 0) {
                 const category = await tx.category.upsert({
                    where: { workspaceId_name_type: { workspaceId, name: "Metas", type: "VAULT_DEPOSIT" } },
                    update: {}, create: { name: "Metas", type: "VAULT_DEPOSIT", workspaceId, icon: "PiggyBank", color: "#f59e0b" }
                });

                await tx.transaction.create({
                    data: {
                        description: `Aporte Inicial: ${myVaultName}`,
                        amount: startBalance,
                        type: 'VAULT_DEPOSIT',
                        date: new Date(),
                        workspaceId,
                        bankAccountId: myVaultAccountId,
                        vaultId: newVault.id,
                        isPaid: true,
                        categoryId: category.id
                    }
                });
                
                await tx.bankAccount.update({ where: { id: myVaultAccountId }, data: { balance: { decrement: startBalance } } });
            }
        }

        // 2. Vincular Cofrinho Existente
        if (useExistingVault === "true" && myExistingVaultId && id) {
            const vault = await tx.vault.findUnique({ where: { id: myExistingVaultId }, include: { bankAccount: true } });
            if (vault && vault.bankAccount.workspaceId === workspaceId) {
                await tx.vault.update({ where: { id: myExistingVaultId }, data: { goalId: id } });
            }
        }

        // Recalcula saldo final da meta
        if (id) await recalculateGoalBalance(id, tx);
    });
  } catch(e: any) {
      console.error(e);
      return { error: e.message || "Erro ao salvar meta." };
  }

  revalidatePath('/dashboard/goals'); 
  revalidatePath('/dashboard/organization');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function deleteGoal(id: string) {
  const { user, error } = await validateUser();
  if (error || !user) return { error };
  
  const goal = await prisma.goal.findUnique({ where: { id }});
  await prisma.goal.delete({ where: { id } });
  
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Goal', details: `Apagou meta ${goal?.name}` });
  
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard/organization');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

// === MOVIMENTAÇÃO DE META (MIGRADO PARA SISTEMA DE COFRINHOS) ===
export async function moveMoneyGoal(goalId: string, amount: number, accountId: string, type: 'DEPOSIT' | 'WITHDRAW') {
    const { user, error } = await validateUser();
    if (error || !user) return { error };

    if (amount <= 0) return { error: "Valor inválido" };

    const goal = await prisma.goal.findUnique({ 
        where: { id: goalId },
        include: { vaults: true } 
    });
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    
    if (!goal || !account) return { error: "Dados inválidos" };
    if (goal.workspaceId && account.workspaceId !== goal.workspaceId) {
        return { error: "A conta e a meta devem pertencer ao mesmo workspace." };
    }

    const isDeposit = type === 'DEPOSIT';
    const txType = isDeposit ? "VAULT_DEPOSIT" : "VAULT_WITHDRAW";
    
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Identificar ou Criar Cofrinho (AUTO-MIGRAÇÃO)
            // Tenta achar um cofrinho vinculado a esta conta bancária
            let targetVault = goal.vaults.find(v => v.bankAccountId === accountId);
            
            if (!targetVault) {
                // Se não existe, cria um "Cofre Principal" automaticamente para permitir a transação
                targetVault = await tx.vault.create({
                    data: {
                        name: "Cofre Principal",
                        bankAccountId: accountId,
                        goalId: goalId,
                        balance: 0,
                        targetAmount: null
                    }
                });
            }

            // 2. Validações de Saldo
            if (isDeposit) {
                if (Number(account.balance) < amount) throw new Error("Saldo insuficiente na conta.");
            } else {
                if (Number(targetVault.balance) < amount) throw new Error("Saldo insuficiente no cofrinho da meta.");
            }

            // 3. Atualizar Saldos (Conta e Cofrinho)
            if (isDeposit) {
                await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
                await tx.vault.update({ where: { id: targetVault.id }, data: { balance: { increment: amount } } });
            } else {
                await tx.bankAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
                await tx.vault.update({ where: { id: targetVault.id }, data: { balance: { decrement: amount } } });
            }

            // 4. Criar Categoria e Transação
            const categoryName = "Metas";
            const categoryIcon = "PiggyBank";
            
            const category = await tx.category.upsert({ 
                where: { workspaceId_name_type: { workspaceId: account.workspaceId, name: categoryName, type: txType } }, 
                update: {}, 
                create: { name: categoryName, type: txType, workspaceId: account.workspaceId, icon: categoryIcon, color: "#f59e0b" } 
            });

            await tx.transaction.create({
                data: { 
                    description: `${isDeposit ? 'Aporte' : 'Resgate'}: ${goal.name}`, 
                    amount, 
                    type: txType, 
                    date: new Date(), 
                    workspaceId: account.workspaceId, 
                    bankAccountId: accountId, 
                    vaultId: targetVault.id, // Vínculo essencial
                    isPaid: true, 
                    categoryId: category.id 
                }
            });

            // 5. Atualizar Saldo Total da Meta
            await recalculateGoalBalance(goalId, tx);
            
            await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Goal', entityId: goalId, details: `${isDeposit ? 'Guardou' : 'Resgatou'} R$ ${amount} via Cofrinho` });
        });
    } catch(e: any) {
        return { error: e.message || "Erro ao processar movimentação." };
    }

    revalidatePath('/dashboard/goals'); 
    revalidatePath('/dashboard/accounts');
    revalidatePath('/dashboard/transactions'); 
    revalidatePath('/dashboard');
    return { success: true };
}

export async function getNotifications() {
    const { user } = await validateUser();
    if (!user) return [];
    const notifs = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 });
    return notifs.map(n => ({...n, createdAt: n.createdAt.toISOString()}));
}

export async function markNotificationAsRead(id: string) {
    const { user } = await validateUser();
    if (user) await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    revalidatePath('/dashboard');
}

export async function markAllNotificationsAsRead() {
    const { user } = await validateUser();
    if (user) await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    revalidatePath('/dashboard');
}

export async function checkDeadlinesAndSendAlerts() {
    const today = new Date();
    const alertDate = new Date(today);
    alertDate.setDate(today.getDate() + 5);
    const alertDay = alertDate.getDate();
    
    const cardsDue = await prisma.creditCard.findMany({ 
        where: { dueDay: alertDay }, 
        select: { name: true, workspace: { select: { tenantId: true } } }
    });
    
    let count = 0;
    
    for (const card of cardsDue) {
        const users = await prisma.user.findMany({ 
            where: { tenantId: card.workspace.tenantId },
            select: { id: true } 
        });

        for (const u of users) {
            await notifyInvoiceDue(u.id, card.name, alertDay);
            count++;
        }
    }
    return { success: true, count };
}