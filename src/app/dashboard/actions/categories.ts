'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";

const CategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  // CORREÇÃO: Removido o objeto de options que causava o erro de build
  type: z.enum(["INCOME", "EXPENSE"]), 
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function upsertCategory(formData: FormData, id?: string) {
  const { user, error } = await validateUser();
  if (error || !user) return { error };

  const workspaceId = await getActiveWorkspaceId(user);
  if (!workspaceId) return { error: "Workspace não encontrado" };

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
      // Retorna o erro do nome ou um erro genérico se o tipo for inválido
      return { error: parsed.error.flatten().fieldErrors.name?.[0] || "Dados inválidos (verifique o tipo da categoria)" };
  }

  const { name, type, icon, color } = parsed.data;

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

  try {
    const category = await prisma.category.findUnique({ 
        where: { id },
        include: { _count: { select: { transactions: true } } }
    });

    if (!category) return { error: "Categoria não encontrada" };
    
    await prisma.category.delete({ where: { id } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Category', details: `Excluiu categoria: ${category.name}` });
  } catch (e) {
      return { error: "Erro ao excluir categoria." };
  }

  revalidatePath('/dashboard/categories');
  revalidatePath('/dashboard/transactions');
  return { success: true };
}