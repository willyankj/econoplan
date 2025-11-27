import { prisma } from "@/lib/prisma";

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// --- FUNÇÃO BASE (Interna ou Genérica) ---
interface SendNotificationProps {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export async function sendNotification({ userId, title, message, type = 'INFO', link }: SendNotificationProps) {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type, link, read: false }
    });
  } catch (error) {
    console.error("Falha ao enviar notificação:", error);
  }
}

// --- NOTIFICAÇÕES DE NEGÓCIO (Centralizadas) ---

/**
 * Alerta sobre fatura de cartão vencendo
 */
export async function notifyInvoiceDue(userId: string, cardName: string, dueDay: number) {
  await sendNotification({
    userId,
    title: "Fatura Próxima",
    message: `O cartão ${cardName} vence dia ${dueDay}. Organize-se para o pagamento.`,
    type: 'WARNING',
    link: '/dashboard/cards'
  });
}

/**
 * Convite para novo membro
 */
export async function notifyUserInvited(userId: string, workspaceName: string) {
  await sendNotification({
    userId,
    title: "Bem-vindo(a)!",
    message: `Você foi convidado para colaborar no workspace "${workspaceName}".`,
    type: 'SUCCESS',
    link: '/dashboard'
  });
}

/**
 * Alerta de Orçamento no Limite (90%) - NOVO
 */
export async function notifyBudgetWarning(userId: string, categoryName: string, percent: number) {
  await sendNotification({
    userId,
    title: "Alerta de Orçamento",
    message: `Atenção! Você já consumiu ${percent}% do seu orçamento para ${categoryName}.`,
    type: 'WARNING',
    link: '/dashboard/budgets'
  });
}

/**
 * Alerta de Orçamento Estourado (100%+)
 */
export async function notifyBudgetExceeded(userId: string, categoryName: string) {
  await sendNotification({
    userId,
    title: "Orçamento Estourado",
    message: `Você ultrapassou o limite definido para ${categoryName}. Revise seus gastos.`,
    type: 'ERROR',
    link: '/dashboard/budgets'
  });
}

// --- UTILS DE GRUPO ---

export async function notifyWorkspaceMembers(workspaceId: string, title: string, message: string, type: NotificationType = 'INFO', excludeUserId?: string) {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { not: excludeUserId } },
      select: { userId: true }
    });

    if (members.length === 0) return;

    const notifications = members.map(m => ({
      userId: m.userId,
      title,
      message,
      type,
      read: false
    }));

    await prisma.notification.createMany({ data: notifications });
  } catch (error) {
    console.error("Falha ao notificar membros:", error);
  }
}