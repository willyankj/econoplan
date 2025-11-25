import { prisma } from "@/lib/prisma";

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

interface SendNotificationProps {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

/**
 * Envia uma notificação para um usuário específico.
 */
export async function sendNotification({ userId, title, message, type = 'INFO', link }: SendNotificationProps) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
        read: false,
      }
    });
  } catch (error) {
    console.error("Falha ao enviar notificação:", error);
  }
}

/**
 * Envia notificação para todos os membros de um Workspace (exceto quem disparou a ação).
 */
export async function notifyWorkspaceMembers(workspaceId: string, title: string, message: string, type: NotificationType = 'INFO', excludeUserId?: string) {
  try {
    // Busca todos os membros do workspace
    const members = await prisma.workspaceMember.findMany({
      where: { 
        workspaceId,
        userId: { not: excludeUserId } // Não notifica quem fez a ação (opcional)
      },
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