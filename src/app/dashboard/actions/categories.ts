'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { validateUser, getActiveWorkspaceId } from "@/lib/action-utils";
import { z } from "zod";

const CategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
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
      return { error: parsed.error.flatten().fieldErrors.name?.[0] || "Dados inválidos" };
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
      const existing = await prisma.category.findFirst({
        where: { workspaceId, name, type }
      });
      
      if (existing) return { error: "Já existe uma categoria com este nome." };

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
    // 1. Verifica integridade antes de deletar
    const category = await prisma.category.findUnique({ 
        where: { id },
        include: { _count: { select: { transactions: true, budgets: true } } }
    });

    if (!category) return { error: "Categoria não encontrada" };

    // Bloqueia se houver vínculos
    if (category._count.transactions > 0) {
        return { error: `Impossível excluir: Existem ${category._count.transactions} transações usando esta categoria.` };
    }
    
    if (category._count.budgets > 0) {
        return { error: "Impossível excluir: Existe um orçamento vinculado a esta categoria." };
    }
    
    await prisma.category.delete({ where: { id } });
    
    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'DELETE', entity: 'Category', details: `Excluiu categoria: ${category.name}` });
  } catch (e) {
      return { error: "Erro ao excluir categoria." };
  }

  revalidatePath('/dashboard/categories');
  revalidatePath('/dashboard/transactions');
  return { success: true };
}