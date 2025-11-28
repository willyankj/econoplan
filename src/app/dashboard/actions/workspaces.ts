'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { createAuditLog } from "@/lib/audit";
import { validateUser } from "@/lib/action-utils";
import { notifyUserInvited } from "@/lib/notifications";
import { z } from "zod";

const WorkspaceSchema = z.object({
    name: z.string().min(1, "Nome do workspace é obrigatório")
});

const InviteSchema = z.object({
    email: z.string().email("E-mail inválido"),
    role: z.enum(["ADMIN", "MEMBER"]),
    workspaceId: z.string().uuid()
});

const RoleUpdateSchema = z.object({
    role: z.string().min(1)
});

export async function switchWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set('activeWorkspaceId', workspaceId, { path: '/' });
  revalidatePath('/dashboard');
}

export async function createWorkspace(formData: FormData) {
  const { user, error } = await validateUser('org_manage_workspaces');
  if (error || !user) return { error };

  const parsed = WorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Nome inválido" };

  const name = parsed.data.name;
  const ws = await prisma.workspace.create({
    data: { name, tenantId: user.tenantId, members: { create: { userId: user.id, role: 'ADMIN' } } }
  });

  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Workspace', entityId: ws.id, details: `Criou workspace "${name}"` });
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateWorkspaceName(workspaceId: string, formData: FormData) {
  const { user, error } = await validateUser('org_manage_workspaces');
  if (error || !user) return { error };

  const parsed = WorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Nome inválido" };

  const name = parsed.data.name;
  await prisma.workspace.update({ where: { id: workspaceId }, data: { name } });

  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Workspace', entityId: workspaceId, details: `Renomeou workspace para "${name}"` });
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteWorkspace(workspaceId: string) {
  const { user, error } = await validateUser('org_manage_workspaces');
  if (error || !user) return { error };

  try {
    await prisma.$transaction(async (tx) => {
        await tx.transaction.deleteMany({ where: { workspaceId } });
        await tx.goal.deleteMany({ where: { workspaceId } });
        await tx.budget.deleteMany({ where: { workspaceId } });
        await tx.creditCard.deleteMany({ where: { workspaceId } });
        await tx.bankAccount.deleteMany({ where: { workspaceId } });
        await tx.workspaceMember.deleteMany({ where: { workspaceId } });
        await tx.category.deleteMany({ where: { workspaceId } });
        await tx.workspace.delete({ where: { id: workspaceId } });
        
        await tx.auditLog.create({
            data: { tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Workspace', details: `Removeu workspace completo` }
        });
    });
  } catch (e) { return { error: "Erro ao excluir workspace." }; }

  const cookieStore = await cookies();
  if (cookieStore.get('activeWorkspaceId')?.value === workspaceId) cookieStore.delete('activeWorkspaceId');

  revalidatePath('/dashboard');
  return { success: true };
}

export async function inviteMember(formData: FormData) {
  const { user: currentUser, error } = await validateUser('org_invite');
  if (error || !currentUser) return { error };

  const parsed = InviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados de convite inválidos" };

  const { email, role, workspaceId } = parsed.data;

  const targetWorkspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!targetWorkspace) return { error: "Workspace inválido." };

  let targetUserId = "";
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    targetUserId = existingUser.id;
    await prisma.user.update({
      where: { email },
      data: { 
        tenantId: currentUser.tenantId, role: role as any, 
        workspaces: { connectOrCreate: { where: { userId_workspaceId: { userId: existingUser.id, workspaceId } }, create: { workspaceId, role: 'MEMBER' } } }
      }
    });
  } else {
    const newUser = await prisma.user.create({
      data: { email, tenantId: currentUser.tenantId, role: role as any, name: "Convidado", workspaces: { create: { workspaceId, role: 'MEMBER' } } }
    });
    targetUserId = newUser.id;
  }

  await notifyUserInvited(targetUserId, targetWorkspace.name);
  
  await createAuditLog({ 
      tenantId: currentUser.tenantId, 
      userId: currentUser.id, 
      action: 'CREATE', 
      entity: 'Member', 
      details: `Convidou ${email} para ${targetWorkspace.name}` 
  });
  
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function removeMember(userId: string) {
    const { user, error } = await validateUser('org_invite');
    if (error || !user) return { error };

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Member', details: `Removeu usuário ${targetUser?.email || userId}` });
    revalidatePath('/dashboard/settings');
    return { success: true };
}

export async function updateMemberRole(userId: string, formData: FormData) {
  const { user, error } = await validateUser('org_invite');
  if (error || !user) return { error };

  const parsed = RoleUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Cargo inválido" };

  const newRole = parsed.data.role;
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  
  await prisma.user.update({ where: { id: userId }, data: { role: newRole as any } });
  
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Member', details: `Alterou cargo de ${targetUser?.email} para ${newRole}` });
  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function toggleWorkspaceAccess(userId: string, workspaceId: string, hasAccess: boolean) {
  const { user, error } = await validateUser('org_invite');
  if (error || !user) return { error };

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  const targetWs = await prisma.workspace.findUnique({ where: { id: workspaceId } });

  if (hasAccess) {
    await prisma.workspaceMember.create({ data: { userId, workspaceId, role: 'MEMBER' } });
  } else {
    const count = await prisma.workspaceMember.count({ where: { userId } });
    if (count <= 1) return { error: "Usuário precisa ter pelo menos 1 workspace." };
    await prisma.workspaceMember.deleteMany({ where: { userId, workspaceId } });
  }

  await createAuditLog({ 
      tenantId: user.tenantId, 
      userId: user.id, 
      action: 'UPDATE', 
      entity: 'Access', 
      details: `${hasAccess ? 'Liberou' : 'Removeu'} acesso de ${targetUser?.email} ao workspace ${targetWs?.name}` 
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function updateTenantName(formData: FormData) {
    const { user, error } = await validateUser('org_manage_workspaces');
    if (error || !user) return { error };
    
    const parsed = WorkspaceSchema.safeParse(Object.fromEntries(formData)); // Reutilizando schema de nome
    if(!parsed.success) return { error: "Nome inválido" };

    const name = parsed.data.name;
    await prisma.tenant.update({ where: { id: user.tenantId }, data: { name } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Tenant', details: `Renomeou organização para "${name}"` });
    revalidatePath('/dashboard/settings');
    return { success: true };
}

export async function updateTenantSettings(settings: any) {
    const { user, error } = await validateUser(); 
    if (error || !user || user.role !== 'OWNER') return { error: "Apenas dono." };
    
    await prisma.tenant.update({ where: { id: user.tenantId }, data: { settings } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Permissions', details: 'Alterou regras de acesso' });
    revalidatePath('/dashboard/settings');
    return { success: true };
}