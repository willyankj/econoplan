'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { notifyInvoiceDue } from "@/lib/notifications"; 
import { z } from "zod";

const BudgetSchema = z.object({
    amount: z.coerce.number().min(0, "Valor inválido"),
    categoryId: z.string().optional()
});

const GoalSchema = z.object({
    name: z.string().min(1, "Nome obrigatório"),
    targetAmount: z.coerce.number().min(0),
    deadline: z.string().optional().nullable(),
    currentAmount: z.coerce.number().optional(),
    contributionRules: z.string().optional(),
    linkedAccountId: z.string().optional().nullable()
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

// === METAS (GOALS) ===
export async function upsertGoal(formData: FormData, id?: string, isShared = false) {
  const { user, error } = await validateUser(isShared ? 'org_view' : undefined);
  if (error || !user) return { error };

  const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  
  const { name, targetAmount, deadline, currentAmount, contributionRules: rulesString, linkedAccountId } = parsed.data;

  let contributionRules = null;
  if (rulesString) {
      try { contributionRules = JSON.parse(rulesString); } catch (e) {}
  }

  const data = {
    name,
    targetAmount,
    deadline: deadline ? new Date(deadline) : null,
    contributionRules: contributionRules ?? undefined,
    linkedAccountId: linkedAccountId === "none" ? null : linkedAccountId
  };

  if (id) {
    await prisma.goal.update({ where: { id }, data });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Goal', entityId: id, details: `Atualizou meta ${data.name}` });
  } else {
    let goalData: any = { 
        ...data, 
        currentAmount: currentAmount || 0 
    };
    
    if (isShared) {
        goalData.tenantId = user.tenantId;
    } else {
        const workspaceId = await getActiveWorkspaceId(user);
        if (!workspaceId) return { error: "Sem workspace" };
        goalData.workspaceId = workspaceId;
    }

    const goal = await prisma.goal.create({ data: goalData });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Goal', entityId: goal.id, details: `Criou meta ${data.name}` });
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

export async function moveMoneyGoal(goalId: string, amount: number, accountId: string, type: 'DEPOSIT' | 'WITHDRAW') {
    const { user, error } = await validateUser();
    if (error || !user) return { error };

    // Validar valores negativos ou zero
    if (amount <= 0) return { error: "Valor inválido" };

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    
    if (!goal || !account) return { error: "Dados inválidos" };

    // CORREÇÃO: Isolamento de Workspace
    // Garante que a conta e a meta pertencem ao mesmo workspace para evitar vazamento de dados
    if (goal.workspaceId && account.workspaceId !== goal.workspaceId) {
        return { error: "A conta e a meta devem pertencer ao mesmo workspace." };
    }

    const isDeposit = type === 'DEPOSIT';
    const txType = isDeposit ? "EXPENSE" : "INCOME";
    
    // CORREÇÃO: Validação de Saldo (Evita "Dinheiro Infinito")
    if (isDeposit) {
        if (Number(account.balance) < amount) {
            return { error: "Saldo insuficiente na conta." };
        }
    } else {
        if (Number(goal.currentAmount) < amount) {
            return { error: "Saldo insuficiente na meta." };
        }
    }
    
    const categoryName = isDeposit ? "Metas" : "Resgate de Metas";
    const categoryIcon = isDeposit ? "PiggyBank" : "Wallet";

    const category = await prisma.category.upsert({ 
        where: { 
            workspaceId_name_type: { 
                workspaceId: account.workspaceId, 
                name: categoryName,
                type: txType 
            } 
        }, 
        update: {}, 
        create: { 
            name: categoryName, 
            type: txType, 
            workspaceId: account.workspaceId,
            icon: categoryIcon,
            color: "#10b981" 
        } 
    });

    try {
        await prisma.$transaction([
            prisma.transaction.create({
                data: { 
                    description: `${isDeposit ? 'Depósito Meta' : 'Resgate Meta'}: ${goal.name}`, 
                    amount, 
                    type: txType, 
                    date: new Date(), 
                    workspaceId: account.workspaceId, 
                    bankAccountId: accountId, 
                    goalId, 
                    isPaid: true, 
                    categoryId: category.id 
                }
            }),
            prisma.bankAccount.update({ where: { id: accountId }, data: { balance: isDeposit ? { decrement: amount } : { increment: amount } } }),
            prisma.goal.update({ where: { id: goalId }, data: { currentAmount: isDeposit ? { increment: amount } : { decrement: amount } } })
        ]);

        await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Goal', entityId: goalId, details: `${isDeposit ? 'Guardou' : 'Resgatou'} R$ ${amount} em ${goal.name}` });
    } catch(e) {
        return { error: "Erro ao processar movimentação." };
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
    
    // Otimização: Selecionar apenas o necessário
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

        // Batch notifications seria ideal aqui, mas loop simples funciona para cargas baixas
        for (const u of users) {
            await notifyInvoiceDue(u.id, card.name, alertDay);
            count++;
        }
    }
    return { success: true, count };
}