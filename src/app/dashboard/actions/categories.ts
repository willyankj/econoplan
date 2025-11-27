'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";

export async function upsertCategory(formData: FormData, id?: string) {
  const { user, error } = await validateUser();
  if (error || !user) return { error };

  const workspaceId = await getActiveWorkspaceId(user);
  if (!workspaceId) return { error: "Workspace não encontrado" };

  const name = formData.get("name") as string;
  const type = formData.get("type") as "INCOME" | "EXPENSE";
  const icon = formData.get("icon") as string;
  const color = formData.get("color") as string;

  if (!name || !type) return { error: "Nome e Tipo são obrigatórios" };

  try {
    if (id) {
      await prisma.category.update({
        where: { id },
        data: { name, type, icon, color }
      });
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entity: 'Category', entityId: id, details: `Editou categoria: ${name}` });
    } else {
      // Verifica duplicidade
      const existing = await prisma.category.findFirst({
        where: { workspaceId, name, type }
      });
      
      if (existing) return { error: "Já existe uma categoria com este nome neste tipo." };

      const cat = await prisma.category.create({
        data: { name, type, icon, color, workspaceId }
      });
      
      await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'CREATE', entity: 'Category', entityId: cat.id, details: `Criou categoria: ${name}` });
    }
  } catch (e) {
    return { error: "Erro ao salvar categoria." };
  }

  revalidatePath('/dashboard/categories');
  revalidatePath('/dashboard/transactions');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { user, error } = await validateUser();
  if (error || !user) return { error };

  // Verifica se tem uso
  const category = await prisma.category.findUnique({ 
      where: { id },
      include: { _count: { select: { transactions: true } } }
  });

  if (!category) return { error: "Categoria não encontrada" };

  // Se tiver muitas transações, poderia bloquear, mas aqui vamos permitir 
  // (as transações ficarão sem categoria devido ao onDelete: SetNull no schema)
  
  await prisma.category.delete({ where: { id } });
  
  await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Category', details: `Excluiu categoria: ${category.name} (${category._count.transactions} transações afetadas)` });

  revalidatePath('/dashboard/categories');
  revalidatePath('/dashboard/transactions');
  return { success: true };
}
