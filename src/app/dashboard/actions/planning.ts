'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { notifyInvoiceDue } from "@/lib/notifications"; 

// === ORÇAMENTOS ===
export async function upsertBudget(formData: FormData, id?: string) {
  const permission = id ? 'budgets_edit' : 'budgets_create';
  const { user, error } = await validateUser(permission);
  if (error || !user) return { error };

  const rawAmount = formData.get("amount") as string;
  const amount = rawAmount ? parseFloat(rawAmount) : 0;
  const categoryId = formData.get("categoryId") as string;

  if (id) {
    await prisma.budget.update({ where: { id }, data: { targetAmount: amount } });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Budget', entityId: id, details: `Atualizou orçamento para R$ ${amount}` });
  } else {
    const workspaceId = await getActiveWorkspaceId(user);
    if (!workspaceId) return { error: "Sem workspace" };
    
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

  const rawTarget = formData.get("targetAmount") as string;
  const targetAmount = rawTarget ? parseFloat(rawTarget) : 0;

  const data = {
    name: formData.get("name") as string,
    targetAmount: isNaN(targetAmount) ? 0 : targetAmount,
    deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null
  };

  if (id) {
    await prisma.goal.update({ where: { id }, data });
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Goal', entityId: id, details: `Atualizou meta ${data.name}` });
  } else {
    const rawCurrent = formData.get("currentAmount") as string;
    const currentAmount = rawCurrent ? parseFloat(rawCurrent) : 0;
    
    let goalData: any = { 
        ...data, 
        currentAmount: isNaN(currentAmount) ? 0 : currentAmount 
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

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!goal || !account) return { error: "Dados inválidos" };

    const isDeposit = type === 'DEPOSIT';
    const txType = isDeposit ? "EXPENSE" : "INCOME";
    const categoryName = isDeposit ? "Investimentos" : "Resgate Investimento";

    // CORREÇÃO: Usando workspaceId_name_type e incluindo 'type'
    const category = await prisma.category.upsert({ 
        where: { 
            workspaceId_name_type: { 
                workspaceId: account.workspaceId, 
                name: categoryName,
                type: txType // Incluído
            } 
        }, 
        update: {}, 
        create: { name: categoryName, type: txType, workspaceId: account.workspaceId } 
    });

    await prisma.$transaction([
        prisma.transaction.create({
            data: { description: `${isDeposit ? 'Depósito' : 'Resgate'}: ${goal.name}`, amount, type: txType, date: new Date(), workspaceId: account.workspaceId, bankAccountId: accountId, goalId, isPaid: true, categoryId: category.id }
        }),
        prisma.bankAccount.update({ where: { id: accountId }, data: { balance: isDeposit ? { decrement: amount } : { increment: amount } } }),
        prisma.goal.update({ where: { id: goalId }, data: { currentAmount: isDeposit ? { increment: amount } : { decrement: amount } } })
    ]);

    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Goal', entityId: goalId, details: `${isDeposit ? 'Guardou' : 'Resgatou'} R$ ${amount} em ${goal.name}` });

    revalidatePath('/dashboard/goals'); 
    revalidatePath('/dashboard/accounts');
    revalidatePath('/dashboard/settings');
    return { success: true };
}

// === SISTEMA / NOTIFICAÇÕES ===
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
        include: { workspace: true } 
    });
    
    let count = 0;
    
    for (const card of cardsDue) {
        // Busca todos os usuários do tenant dono do cartão
        const users = await prisma.user.findMany({ 
            where: { tenantId: card.workspace.tenantId } 
        });

        for (const u of users) {
            // USA A FUNÇÃO CENTRALIZADA
            await notifyInvoiceDue(u.id, card.name, alertDay);
            count++;
        }
    }
    return { success: true, count };
}