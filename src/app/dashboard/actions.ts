'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { checkPermission } from "@/lib/permissions";

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

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { name }
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

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function createWorkspace(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const name = formData.get("name") as string;
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user) return { error: "Erro de usuário" };

  await prisma.workspace.create({
    data: {
      name,
      tenantId: user.tenantId,
      members: {
        create: {
          userId: user.id,
          role: 'ADMIN'
        }
      }
    }
  });

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateWorkspaceName(workspaceId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const name = formData.get("name") as string;

  // Verifica permissão (Owner ou Admin)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return { error: "Sem permissão." };
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name }
  });

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard'); 
  return { success: true };
}

export async function inviteMember(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const email = formData.get("email") as string;
  const role = formData.get("role") as "ADMIN" | "MEMBER";
  const workspaceId = formData.get("workspaceId") as string;

  if (!workspaceId) return { error: "Selecione um workspace." };

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: { include: { workspaces: true } } }
  });

  if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
    return { error: "Sem permissão." };
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
          connectOrCreate: {
            where: { userId_workspaceId: { userId: existingUser.id, workspaceId: targetWorkspace.id } },
            create: { workspaceId: targetWorkspace.id, role: 'MEMBER' }
          }
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
        workspaces: {
            create: {
                workspaceId: targetWorkspace.id,
                role: 'MEMBER'
            }
        }
      }
    });
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function removeMember(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/dashboard/settings');
    return { success: true };
}

export async function deleteWorkspace(workspaceId: string) {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true };
}

export async function toggleWorkspaceAccess(userId: string, workspaceId: string, hasAccess: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
      return { error: "Sem permissão." };
  }

  if (hasAccess) {
    await prisma.workspaceMember.create({
        data: { userId, workspaceId, role: 'MEMBER' }
    });
  } else {
    const count = await prisma.workspaceMember.count({ where: { userId } });
    if (count <= 1) return { error: "O usuário precisa ter pelo menos um workspace." };

    await prisma.workspaceMember.deleteMany({
        where: { userId, workspaceId }
    });
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}


// ============================================================================
// 2. TRANSAÇÕES (RECEITAS E DESPESAS)
// ============================================================================

export async function createTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: true } 
  });

  if (!user) return { error: "Usuário não encontrado" };
  
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

  const category = await prisma.category.upsert({
    where: {
      workspaceId_name: { workspaceId, name: categoryName }
    },
    update: {},
    create: { name: categoryName, type, workspaceId }
  });

  if (paymentMethod === "ACCOUNT") {
    const accountId = formData.get("accountId") as string;
    if (!accountId) return { error: "Selecione uma conta bancária!" };

    await prisma.transaction.create({
      data: {
        description, amount, type, date, workspaceId,
        bankAccountId: accountId,
        categoryId: category.id,
        isPaid: true
      }
    });

    if (type === 'INCOME') {
      await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
    } else {
      await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
    }
  } 
  else if (paymentMethod === "CREDIT_CARD") {
    const cardId = formData.get("cardId") as string;
    if (!cardId) return { error: "Selecione um cartão!" };

    const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
    if (!card) return { error: "Cartão não encontrado" };

    let invoiceDate = new Date(date);
    if (date.getDate() >= card.closingDay) {
       invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    }
    
    await prisma.transaction.create({
      data: {
        description, amount, type, date, workspaceId,
        creditCardId: cardId,
        categoryId: category.id,
        isPaid: false
      }
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function updateTransaction(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const categoryName = formData.get("category") as string;
  const dateString = formData.get("date") as string;
  const date = new Date(dateString + "T12:00:00");

  const oldTransaction = await prisma.transaction.findUnique({ where: { id } });
  if (!oldTransaction) return { error: "Erro" };

  const category = await prisma.category.upsert({
    where: { workspaceId_name: { workspaceId: oldTransaction.workspaceId, name: categoryName } },
    update: {},
    create: { name: categoryName, type: oldTransaction.type, workspaceId: oldTransaction.workspaceId }
  });
  
  if (oldTransaction.bankAccountId && oldTransaction.isPaid) {
      // Reverte saldo antigo
      if (oldTransaction.type === 'INCOME') {
          await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { decrement: oldTransaction.amount } } });
      } else {
          await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { increment: oldTransaction.amount } } });
      }
      // Aplica saldo novo
      if (oldTransaction.type === 'INCOME') {
          await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { increment: amount } } });
      } else {
          await prisma.bankAccount.update({ where: { id: oldTransaction.bankAccountId }, data: { balance: { decrement: amount } } });
      }
  }

  await prisma.transaction.update({
    where: { id },
    data: { description, amount, date, categoryId: category.id }
  });
  
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) return { error: "Erro" };

  if (transaction.bankAccountId && transaction.isPaid) {
    if (transaction.type === 'INCOME') {
      await prisma.bankAccount.update({ where: { id: transaction.bankAccountId }, data: { balance: { decrement: transaction.amount } } });
    } else {
      await prisma.bankAccount.update({ where: { id: transaction.bankAccountId }, data: { balance: { increment: transaction.amount } } });
    }
  }

  await prisma.transaction.delete({ where: { id } });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/organization');
  return { success: true };
}


// ============================================================================
// 3. CONTAS BANCÁRIAS
// ============================================================================

export async function createAccount(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true } });
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user!.workspaces[0].workspaceId;

  await prisma.bankAccount.create({
    data: {
      name: formData.get("name") as string,
      bank: formData.get("bank") as string,
      balance: parseFloat(formData.get("balance") as string) || 0,
      workspaceId,
      isIncluded: true
    }
  });
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function updateAccount(id: string, formData: FormData) {
  await prisma.bankAccount.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      bank: formData.get("bank") as string,
      balance: parseFloat(formData.get("balance") as string)
    }
  });
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteAccount(id: string) {
  await prisma.bankAccount.delete({ where: { id } });
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/organization');
  return { success: true };
}


// ============================================================================
// 4. CARTÕES DE CRÉDITO
// ============================================================================

export async function createCreditCard(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };
  
  const user = await prisma.user.findUnique({ 
      where: { email: session.user.email }, 
      include: { workspaces: true, tenant: true } 
  });
  
  const canCreate = checkPermission(user!.role, user!.tenant.settings, 'canCreateCards');
  if (!canCreate) {
      return { error: "Seu perfil não tem permissão para criar cartões." };
  }

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user!.workspaces[0].workspaceId;

  const bankName = formData.get("bank") as string;

  await prisma.creditCard.create({
    data: {
      name: formData.get("name") as string,
      bank: bankName,
      limit: parseFloat(formData.get("limit") as string),
      closingDay: parseInt(formData.get("closingDay") as string),
      dueDay: parseInt(formData.get("dueDay") as string),
      workspaceId
    }
  });
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function updateCreditCard(id: string, formData: FormData) {
  const bankName = formData.get("bank") as string;
  await prisma.creditCard.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      bank: bankName,
      limit: parseFloat(formData.get("limit") as string),
      closingDay: parseInt(formData.get("closingDay") as string),
      dueDay: parseInt(formData.get("dueDay") as string)
    }
  });
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function deleteCreditCard(id: string) {
  await prisma.creditCard.delete({ where: { id } });
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function payCreditCardInvoice(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const cardId = formData.get("cardId") as string;
  const accountId = formData.get("accountId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const dateString = formData.get("date") as string;
  const date = new Date(dateString + "T12:00:00");
  
  const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  
  if (!card || !account) return { error: "Dados inválidos" };

  const category = await prisma.category.upsert({
    where: {
      workspaceId_name: {
        workspaceId: card.workspaceId,
        name: "Pagamento de Fatura"
      }
    },
    update: {},
    create: {
      name: "Pagamento de Fatura",
      type: "EXPENSE",
      workspaceId: card.workspaceId
    }
  });

  await prisma.transaction.create({
    data: {
      description: `Pagamento Fatura - ${card.name}`,
      amount: amount,
      type: "EXPENSE",
      date: date,
      workspaceId: card.workspaceId,
      bankAccountId: accountId,
      categoryId: category.id,
      isPaid: true 
    }
  });

  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { balance: { decrement: amount } }
  });

  await prisma.transaction.updateMany({
    where: {
      creditCardId: cardId,
      isPaid: false,
      date: { lte: date }
    },
    data: { isPaid: true }
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/organization');
  
  return { success: true };
}


// ============================================================================
// 5. ORÇAMENTOS (BUDGETS)
// ============================================================================

export async function createBudget(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true } });
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user!.workspaces[0].workspaceId;

  const categoryId = formData.get("categoryId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  const existingBudget = await prisma.budget.findFirst({
    where: { workspaceId, categoryId }
  });

  if (existingBudget) {
    await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { targetAmount: amount }
    });
  } else {
    await prisma.budget.create({
      data: {
        name: "Orçamento Mensal", 
        targetAmount: amount,
        workspaceId,
        categoryId
      }
    });
  }

  revalidatePath('/dashboard/budgets');
  return { success: true };
}

export async function updateBudget(id: string, formData: FormData) {
  const amount = parseFloat(formData.get("amount") as string);
  await prisma.budget.update({
    where: { id },
    data: { targetAmount: amount }
  });
  revalidatePath('/dashboard/budgets');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteBudget(id: string) {
  await prisma.budget.delete({ where: { id } });
  revalidatePath('/dashboard/budgets');
  return { success: true };
}


// ============================================================================
// 6. METAS (GOALS)
// ============================================================================

export async function createGoal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: true } });
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;
  const workspaceId = activeWorkspaceId || user!.workspaces[0].workspaceId;

  await prisma.goal.create({
    data: {
      name: formData.get("name") as string,
      targetAmount: parseFloat(formData.get("targetAmount") as string),
      currentAmount: parseFloat(formData.get("currentAmount") as string) || 0,
      deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
      workspaceId
    }
  });

  revalidatePath('/dashboard/goals');
  return { success: true };
}

// --- NOVA AÇÃO PARA METAS COMPARTILHADAS ---
export async function createSharedGoal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user) return { error: "Erro usuário" };

  await prisma.goal.create({
    data: {
      name: formData.get("name") as string,
      targetAmount: parseFloat(formData.get("targetAmount") as string),
      currentAmount: 0,
      deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
      tenantId: user.tenantId,
      workspaceId: null
    }
  });

  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function updateGoal(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const deadlineString = formData.get("deadline") as string;
  
  await prisma.goal.update({
    where: { id },
    data: {
      name,
      targetAmount,
      deadline: deadlineString ? new Date(deadlineString) : null
    }
  });
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function deleteGoal(id: string) {
  await prisma.goal.delete({ where: { id } });
  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

// --- CORREÇÃO PRINCIPAL AQUI EMBAIXO ---

export async function addMoneyToGoal(goalId: string, amount: number, accountId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return { error: "Meta não encontrada" };

  // FIX: Buscar a conta para saber o workspaceId CORRETO
  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  if (!account) return { error: "Conta não encontrada" };

  const workspaceId = account.workspaceId; // <--- USAMOS O DA CONTA, NÃO DA META

  const category = await prisma.category.upsert({
    where: { workspaceId_name: { workspaceId: workspaceId, name: "Investimentos" } },
    update: {},
    create: { name: "Investimentos", type: "EXPENSE", workspaceId: workspaceId }
  });

  await prisma.transaction.create({
    data: {
      description: `Depósito na Meta: ${goal.name}`,
      amount: amount,
      type: "EXPENSE", 
      date: new Date(),
      workspaceId: workspaceId,
      bankAccountId: accountId,
      goalId: goal.id,
      isPaid: true,
      categoryId: category.id
    }
  });

  await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
  await prisma.goal.update({ where: { id: goalId }, data: { currentAmount: { increment: amount } } });

  revalidatePath('/dashboard/goals');
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/organization');
  return { success: true };
}

export async function withdrawMoneyFromGoal(goalId: string, amount: number, accountId: string) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) return { error: "Meta não encontrada" };
  
    // FIX: Buscar a conta para saber o workspaceId CORRETO
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) return { error: "Conta não encontrada" };

    const workspaceId = account.workspaceId; // <--- USAMOS O DA CONTA

    await prisma.goal.update({ where: { id: goalId }, data: { currentAmount: { decrement: amount } } });

    const category = await prisma.category.upsert({
        where: { workspaceId_name: { workspaceId: workspaceId, name: "Resgate Investimento" } },
        update: {},
        create: { name: "Resgate Investimento", type: "INCOME", workspaceId: workspaceId }
    });

    await prisma.transaction.create({
      data: {
        description: `Resgate da Meta: ${goal.name}`,
        amount: amount,
        type: "INCOME",
        date: new Date(),
        workspaceId: workspaceId,
        bankAccountId: accountId,
        goalId: goal.id,
        isPaid: true,
        categoryId: category.id
      }
    });
  
    await prisma.bankAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
  
    revalidatePath('/dashboard/goals');
    revalidatePath('/dashboard/accounts');
    revalidatePath('/dashboard/organization');
    return { success: true };
}