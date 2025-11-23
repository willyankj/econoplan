'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { checkPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

// ============================================================================
// 1. GESTÃO DO TENANT, WORKSPACE E MEMBROS
// ============================================================================

export async function switchWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set('activeWorkspaceId', workspaceId, {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    path: '/',
  });
  revalidatePath('/dashboard');
}

export async function updateTenantName(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const name = formData.get("name") as string;
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return { error: "Sem permissão." };
  }

  await prisma.tenant.update({ where: { id: user.tenantId }, data: { name } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Tenant', details: `Renomeou organização para "${name}"`
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function updateTenantSettings(settings: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user || user.role !== 'OWNER') {
    return { error: "Apenas o proprietário pode alterar as permissões." };
  }

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { settings: settings }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Permissions', details: 'Alterou regras de acesso'
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function createWorkspace(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const name = formData.get("name") as string;
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });

  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'org_manage_workspaces')) {
     return { error: "Sem permissão para criar workspaces." };
  }

  const ws = await prisma.workspace.create({
    data: {
      name,
      tenantId: user.tenantId,
      members: { create: { userId: user.id, role: 'ADMIN' } }
    }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Workspace', entityId: ws.id, details: `Criou workspace "${name}"`
  });

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateWorkspaceName(workspaceId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const name = formData.get("name") as string;
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });

  if (!user) return { error: "Erro usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'org_manage_workspaces')) {
      return { error: "Sem permissão para editar workspaces." };
  }

  await prisma.workspace.update({ where: { id: workspaceId }, data: { name } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Workspace', entityId: workspaceId, details: `Renomeou workspace para "${name}"`
  });

  revalidatePath('/dashboard/settings'); revalidatePath('/dashboard'); 
  return { success: true };
}

export async function inviteMember(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const email = formData.get("email") as string;
  const role = formData.get("role") as "ADMIN" | "MEMBER";
  const workspaceId = formData.get("workspaceId") as string;

  if (!workspaceId) return { error: "Selecione um workspace." };

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: { include: { workspaces: true } } } });

  if (!currentUser) return { error: "Erro usuário" };

  if (!checkPermission(currentUser.role, currentUser.tenant.settings, 'org_invite')) {
      return { error: "Sem permissão para convidar." };
  }

  const targetWorkspace = currentUser.tenant.workspaces.find(w => w.id === workspaceId);
  if (!targetWorkspace) return { error: "Workspace inválido." };

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: { 
        tenantId: currentUser.tenantId,
        role: role,
        workspaces: {
          connectOrCreate: { where: { userId_workspaceId: { userId: existingUser.id, workspaceId: targetWorkspace.id } }, create: { workspaceId: targetWorkspace.id, role: 'MEMBER' } }
        }
      }
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        tenantId: currentUser.tenantId,
        role: role,
        name: "Convidado Pendente",
        workspaces: { create: { workspaceId: targetWorkspace.id, role: 'MEMBER' } }
      }
    });
  }

  await createAuditLog({
      tenantId: currentUser.tenantId, userId: currentUser.id, action: 'CREATE', entity: 'Member', details: `Convidou ${email} para workspace ${targetWorkspace.name} como ${role}`
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function removeMember(userId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: "Não autorizado" };

    const currentUser = await prisma.user.findUnique({ 
        where: { email: session.user.email },
        include: { tenant: true }
    });

    if (!currentUser) return { error: "Erro usuário" }; // FIX

    if (!checkPermission(currentUser.role, currentUser.tenant.settings, 'org_invite')) {
        return { error: "Sem permissão." };
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.user.delete({ where: { id: userId } });

    await createAuditLog({
      tenantId: currentUser.tenantId, userId: currentUser.id, action: 'DELETE', entity: 'Member', details: `Removeu usuário ${targetUser?.email}`
    });

    revalidatePath('/dashboard/settings');
    return { success: true };
}

export async function updateMemberRole(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const newRole = formData.get("role") as string;
  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  if (!currentUser) return { error: "Erro usuário" };

  if (!checkPermission(currentUser.role, currentUser.tenant.settings, 'org_invite')) {
      return { error: "Sem permissão." };
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (targetUser?.role === 'OWNER') return { error: "Não pode alterar o Dono." };

  await prisma.user.update({ where: { id: userId }, data: { role: newRole as any } });

  await createAuditLog({
      tenantId: currentUser.tenantId, userId: currentUser.id, action: 'UPDATE', entity: 'Member', details: `Alterou cargo de ${targetUser?.email} para ${newRole}`
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function deleteWorkspace(workspaceId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: "Não autorizado" };
    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });

    if (!currentUser) return { error: "Erro usuário" }; // FIX

    if (!checkPermission(currentUser.role, currentUser.tenant.settings, 'org_manage_workspaces')) {
        return { error: "Sem permissão." };
    }
    
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }});
    await prisma.workspace.delete({ where: { id: workspaceId } });

    await createAuditLog({
      tenantId: currentUser.tenantId, userId: currentUser.id, action: 'DELETE', entity: 'Workspace', details: `Removeu workspace "${ws?.name}"`
    });

    revalidatePath('/dashboard/settings'); revalidatePath('/dashboard');
    return { success: true };
}

export async function toggleWorkspaceAccess(userId: string, workspaceId: string, hasAccess: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  if (!currentUser) return { error: "Erro usuário" };

  if (!checkPermission(currentUser.role, currentUser.tenant.settings, 'org_invite')) {
      return { error: "Sem permissão." };
  }

  if (hasAccess) {
    await prisma.workspaceMember.create({ data: { userId, workspaceId, role: 'MEMBER' } });
  } else {
    const count = await prisma.workspaceMember.count({ where: { userId } });
    if (count <= 1) return { error: "Usuário precisa ter pelo menos 1 workspace." };
    await prisma.workspaceMember.deleteMany({ where: { userId, workspaceId } });
  }

  await createAuditLog({
      tenantId: currentUser.tenantId, userId: currentUser.id, action: 'UPDATE', entity: 'Access', details: `${hasAccess ? 'Liberou' : 'Removeu'} acesso ao workspace ${workspaceId}`
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}


// ============================================================================
// 2. TRANSAÇÕES
// ============================================================================

export async function createTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true, tenant: true } });
  if (!user) return { error: "Usuário não encontrado" };

  if (!checkPermission(user.role, user.tenant.settings, 'transactions_create')) {
      return { error: "Sem permissão para criar lançamentos." };
  }
  
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user.workspaces[0].workspaceId;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as "INCOME" | "EXPENSE";
  const dateString = formData.get("date") as string;
  const date = new Date(dateString + "T12:00:00"); 
  const categoryName = formData.get("category") as string;
  const paymentMethod = formData.get("paymentMethod") as "ACCOUNT" | "CREDIT_CARD";

  const category = await prisma.category.upsert({ where: { workspaceId_name: { workspaceId, name: categoryName } }, update: {}, create: { name: categoryName, type, workspaceId } });

  if (paymentMethod === "ACCOUNT") {
    const accountId = formData.get("accountId") as string;
    await prisma.transaction.create({ data: { description, amount, type, date, workspaceId, bankAccountId: accountId, categoryId: category.id, isPaid: true } });
    if (type === 'INCOME') await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
    else await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
  } 
  else {
    const cardId = formData.get("cardId") as string;
    await prisma.transaction.create({ data: { description, amount, type, date, workspaceId, creditCardId: cardId, categoryId: category.id, isPaid: false } });
  }

  // TRADUÇÃO PARA O LOG
  const typePT = type === 'INCOME' ? 'Receita' : 'Despesa';

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Transaction', details: `${typePT}: ${description} (R$ ${amount})`
  });

  revalidatePath('/dashboard'); revalidatePath('/dashboard/transactions'); revalidatePath('/dashboard/cards'); revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function updateTransaction(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Usuário não encontrado" };
  
  if (!checkPermission(user.role, user.tenant.settings, 'transactions_edit')) return { error: "Sem permissão." };
  
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const categoryName = formData.get("category") as string;
  const dateString = formData.get("date") as string;
  const date = new Date(dateString + "T12:00:00");

  const oldTransaction = await prisma.transaction.findUnique({ where: { id } });
  if (!oldTransaction) return { error: "Erro" };

  const category = await prisma.category.upsert({ where: { workspaceId_name: { workspaceId: oldTransaction.workspaceId, name: categoryName } }, update: {}, create: { name: categoryName, type: oldTransaction.type, workspaceId: oldTransaction.workspaceId } });
  
  if (oldTransaction.bankAccountId && oldTransaction.isPaid) {
      if (oldTransaction.type === 'INCOME') await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { decrement: oldTransaction.amount } } });
      else await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { increment: oldTransaction.amount } } });
      if (oldTransaction.type === 'INCOME') await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { increment: amount } } });
      else await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { decrement: amount } } });
  }

  await prisma.transaction.update({ where: { id }, data: { description, amount, date, categoryId: category.id } });
  
  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Transaction', entityId: id, details: `Alterou: ${description} (R$ ${amount})`
  });

  revalidatePath('/dashboard/transactions'); revalidatePath('/dashboard'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      include: { tenant: true }
  });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'transactions_delete')) {
      return { error: "Sem permissão para excluir transações." };
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) return { error: "Erro" };

  if (transaction.bankAccountId && transaction.isPaid) {
    if (transaction.type === 'INCOME') await prisma.bankAccount.update({ where: { id: transaction.bankAccountId }, data: { balance: { decrement: transaction.amount } } });
    else await prisma.bankAccount.update({ where: { id: transaction.bankAccountId }, data: { balance: { increment: transaction.amount } } });
  }
  await prisma.transaction.delete({ where: { id } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Transaction', details: `Apagou: ${transaction.description}`
  });

  revalidatePath('/dashboard'); revalidatePath('/dashboard/transactions'); revalidatePath('/dashboard/cards'); revalidatePath('/dashboard/organization');
  return { success: true };
}


// ============================================================================
// 3. CONTAS BANCÁRIAS
// ============================================================================

export async function createAccount(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true, tenant: true } });

  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'accounts_create')) return { error: "Sem permissão." };
  
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user.workspaces[0].workspaceId;
  const name = formData.get("name") as string;
  const bank = formData.get("bank") as string;

  await prisma.bankAccount.create({
    data: { name, bank, balance: parseFloat(formData.get("balance") as string) || 0, workspaceId, isIncluded: true }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Account', details: `Criou conta: ${name} (${bank})`
  });

  revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function updateAccount(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };
  
  if (!checkPermission(user.role, user.tenant.settings, 'accounts_edit')) return { error: "Sem permissão." };
  
  const name = formData.get("name") as string;
  await prisma.bankAccount.update({
    where: { id }, data: { name, bank: formData.get("bank") as string, balance: parseFloat(formData.get("balance") as string) }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Account', entityId: id, details: `Atualizou conta ${name}`
  });

  revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'accounts_delete')) return { error: "Sem permissão para excluir contas." };

  const acc = await prisma.bankAccount.findUnique({ where: { id } });
  await prisma.bankAccount.delete({ where: { id } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Account', details: `Apagou conta: ${acc?.name}`
  });

  revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard'); revalidatePath('/dashboard/organization');
  return { success: true };
}


// ============================================================================
// 4. CARTÕES DE CRÉDITO
// ============================================================================

export async function createCreditCard(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true, tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };
  
  if (!checkPermission(user.role, user.tenant.settings, 'cards_create')) return { error: "Seu perfil não tem permissão." };

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user.workspaces[0].workspaceId;
  const name = formData.get("name") as string;

  await prisma.creditCard.create({
    data: { name, bank: formData.get("bank") as string, limit: parseFloat(formData.get("limit") as string), closingDay: parseInt(formData.get("closingDay") as string), dueDay: parseInt(formData.get("dueDay") as string), workspaceId }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Card', details: `Criou cartão: ${name}`
  });

  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function updateCreditCard(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'cards_edit')) return { error: "Sem permissão." };

  const name = formData.get("name") as string;
  await prisma.creditCard.update({
    where: { id }, data: { name, bank: formData.get("bank") as string, limit: parseFloat(formData.get("limit") as string), closingDay: parseInt(formData.get("closingDay") as string), dueDay: parseInt(formData.get("dueDay") as string) }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Card', entityId: id, details: `Atualizou cartão: ${name}`
  });

  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function deleteCreditCard(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'cards_delete')) return { error: "Sem permissão." };

  const card = await prisma.creditCard.findUnique({ where: { id } });
  await prisma.creditCard.delete({ where: { id } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Card', details: `Apagou cartão: ${card?.name}`
  });

  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function payCreditCardInvoice(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'cards_pay')) return { error: "Sem permissão para pagar." };

  const cardId = formData.get("cardId") as string;
  const accountId = formData.get("accountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = new Date((formData.get("date") as string) + "T12:00:00");
  const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  
  if (!card || !account) return { error: "Dados inválidos" };

  const category = await prisma.category.upsert({ where: { workspaceId_name: { workspaceId: card.workspaceId, name: "Pagamento de Fatura" } }, update: {}, create: { name: "Pagamento de Fatura", type: "EXPENSE", workspaceId: card.workspaceId } });
  await prisma.transaction.create({ data: { description: `Pagamento Fatura - ${card.name}`, amount, type: "EXPENSE", date, workspaceId: card.workspaceId, bankAccountId: accountId, categoryId: category.id, isPaid: true } });
  await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
  await prisma.transaction.updateMany({ where: { creditCardId: cardId, isPaid: false, date: { lte: date } }, data: { isPaid: true } });
  
  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'ACTION', entity: 'Card', details: `Pagou fatura ${card.name} (R$ ${amount})`
  });

  revalidatePath('/dashboard'); revalidatePath('/dashboard/cards'); revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard/transactions'); revalidatePath('/dashboard/organization');
  return { success: true };
}


// ============================================================================
// 5. ORÇAMENTOS (BUDGETS)
// ============================================================================

export async function createBudget(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true, tenant: true } });

  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'budgets_create')) return { error: "Sem permissão." };

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user.workspaces[0].workspaceId;
  const categoryId = formData.get("categoryId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  
  await prisma.budget.create({ data: { name: "Orçamento Mensal", targetAmount: amount, workspaceId, categoryId } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Budget', details: `Definiu orçamento de R$ ${amount}`
  });

  revalidatePath('/dashboard/budgets');
  return { success: true };
}

export async function updateBudget(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'budgets_edit')) return { error: "Sem permissão." };

  const amount = parseFloat(formData.get("amount") as string);
  await prisma.budget.update({ where: { id }, data: { targetAmount: amount } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Budget', entityId: id, details: `Atualizou orçamento para R$ ${amount}`
  });

  revalidatePath('/dashboard/budgets'); revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteBudget(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'budgets_delete')) return { error: "Sem permissão." };

  await prisma.budget.delete({ where: { id } });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Budget', details: `Removeu orçamento`
  });

  revalidatePath('/dashboard/budgets');
  return { success: true };
}


// ============================================================================
// 6. METAS (GOALS)
// ============================================================================

export async function createGoal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true, tenant: true } });
  
  // FIX: Verificação de usuário nulo
  if (!user) return { error: "Erro de usuário" };

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user.workspaces[0].workspaceId;
  const name = formData.get("name") as string;

  await prisma.goal.create({
    data: { name, targetAmount: parseFloat(formData.get("targetAmount") as string), currentAmount: parseFloat(formData.get("currentAmount") as string) || 0, deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null, workspaceId }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Goal', details: `Criou meta: ${name}`
  });

  revalidatePath('/dashboard/goals');
  return { success: true };
}

export async function createSharedGoal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } });
  if (!user) return { error: "Erro usuário" };

  if (!checkPermission(user.role, user.tenant.settings, 'org_view')) return { error: "Sem permissão." };

  const name = formData.get("name") as string;
  await prisma.goal.create({
    data: { name, targetAmount: parseFloat(formData.get("targetAmount") as string), currentAmount: 0, deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null, tenantId: user.tenantId, workspaceId: null }
  });

  await createAuditLog({
      tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Goal', details: `Criou meta COMPARTILHADA: ${name}`
  });

  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function updateGoal(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const deadlineString = formData.get("deadline") as string;
  await prisma.goal.update({ where: { id }, data: { name, targetAmount, deadline: deadlineString ? new Date(deadlineString) : null } });
  revalidatePath('/dashboard/goals'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteGoal(id: string) {
  await prisma.goal.delete({ where: { id } });
  revalidatePath('/dashboard/goals'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function addMoneyToGoal(goalId: string, amount: number, accountId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return { error: "Meta não encontrada" };
  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  if (!account) return { error: "Conta não encontrada" };
  const workspaceId = account.workspaceId;

  const category = await prisma.category.upsert({ where: { workspaceId_name: { workspaceId: workspaceId, name: "Investimentos" } }, update: {}, create: { name: "Investimentos", type: "EXPENSE", workspaceId } });

  await prisma.transaction.create({ data: { description: `Depósito na Meta: ${goal.name}`, amount, type: "EXPENSE", date: new Date(), workspaceId, bankAccountId: accountId, goalId: goal.id, isPaid: true, categoryId: category.id } });
  await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
  const updatedGoal = await prisma.goal.update({ where: { id: goalId }, data: { currentAmount: { increment: amount } }, include: { workspace: { select: { tenantId: true } } } });

  if (Number(updatedGoal.currentAmount) >= Number(updatedGoal.targetAmount) && Number(updatedGoal.targetAmount) > 0) {
     let notificationUserIds: string[] = [];
     if (updatedGoal.tenantId) {
         const members = await prisma.user.findMany({ where: { tenantId: updatedGoal.tenantId }, select: { id: true } });
         notificationUserIds = members.map(m => m.id);
     } else if (updatedGoal.workspaceId) {
         const workspaceMembers = await prisma.workspaceMember.findMany({ where: { workspaceId: updatedGoal.workspaceId }, select: { userId: true } });
         notificationUserIds = workspaceMembers.map(wm => wm.userId);
     }
     const title = `Meta Atingida! 🎉`;
     const message = `Parabéns, o objetivo "${updatedGoal.name}" foi totalmente concluído.`;
     for (const userId of notificationUserIds) { await createNotification({ userId, title, message, type: "SUCCESS", link: "/dashboard/goals" }); }
  }

  revalidatePath('/dashboard/goals'); revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function withdrawMoneyFromGoal(goalId: string, amount: number, accountId: string) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) return { error: "Meta não encontrada" };
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };
    const workspaceId = account.workspaceId;
    await prisma.goal.update({ where: { id: goalId }, data: { currentAmount: { decrement: amount } } });
    const category = await prisma.category.upsert({ where: { workspaceId_name: { workspaceId: workspaceId, name: "Resgate Investimento" } }, update: {}, create: { name: "Resgate Investimento", type: "INCOME", workspaceId } });
    await prisma.transaction.create({ data: { description: `Resgate da Meta: ${goal.name}`, amount, type: "INCOME", date: new Date(), workspaceId, bankAccountId: accountId, goalId: goal.id, isPaid: true, categoryId: category.id } });
    await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
    revalidatePath('/dashboard/goals'); revalidatePath('/dashboard/accounts'); revalidatePath('/dashboard/organization'); return { success: true };
}


// ============================================================================
// 7. CRONS E NOTIFICAÇÕES
// ============================================================================

interface NotificationPayload { userId: string; title: string; message: string; type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | string; link?: string; }
async function createNotification(payload: NotificationPayload) {
    if (!payload.userId) return;
    await prisma.notification.create({ data: { userId: payload.userId, title: payload.title, message: payload.message, type: payload.type, link: payload.link, read: false } });
    revalidatePath('/dashboard'); 
}

export async function checkDeadlinesAndSendAlerts() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    await prisma.notification.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } });
    await prisma.auditLog.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } });

    const alertDate = new Date(today);
    alertDate.setDate(today.getDate() + 5);
    const alertDay = alertDate.getDate();
    const cardsDue = await prisma.creditCard.findMany({ where: { dueDay: alertDay }, include: { workspace: { select: { tenantId: true, name: true } } } });
    let alertCount = 0;
    for (const card of cardsDue) {
        const members = await prisma.user.findMany({ where: { tenantId: card.workspace.tenantId }, select: { id: true, name: true } });
        const title = `Fatura Próxima: ${card.name}`;
        const message = `A fatura do cartão ${card.name} (Workspace: ${card.workspace.name}) vence em 5 dias (${alertDay.toString().padStart(2, '0')}).`;
        for (const member of members) {
            await createNotification({ userId: member.id, title, message, type: "WARNING", link: "/dashboard/cards" });
            alertCount++;
        }
    }
    return { success: true, count: alertCount };
}

export async function getNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return [];
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return [];
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 });
  return notifications.map(n => ({ ...n, createdAt: n.createdAt.toISOString() }));
}

export async function markNotificationAsRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user) { await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } }); }
  revalidatePath('/dashboard');
}

export async function markAllNotificationsAsRead() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return;
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return;
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    revalidatePath('/dashboard');
}