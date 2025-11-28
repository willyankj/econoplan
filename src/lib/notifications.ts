import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// --- FUNÇÃO BASE (Interna - Salva no Banco) ---
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
    console.error("Falha ao salvar notificação no banco:", error);
  }
}

// --- AUXILIAR: Busca dados do usuário ---
async function getUserEmail(userId: string) {
    return await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
}

// --- NOTIFICAÇÕES DE NEGÓCIO (Com disparo de E-mail) ---

/**
 * Alerta sobre fatura de cartão vencendo
 */
export async function notifyInvoiceDue(userId: string, cardName: string, dueDay: number) {
  const message = `O cartão ${cardName} vence dia ${dueDay}. Organize-se para o pagamento.`;
  
  // 1. Notificação no Painel
  await sendNotification({
    userId,
    title: "Fatura Próxima",
    message,
    type: 'WARNING',
    link: '/dashboard/cards'
  });

  // 2. E-mail
  const user = await getUserEmail(userId);
  if (user?.email) {
      await sendEmail({
          to: user.email,
          subject: `⚠️ Fatura do ${cardName} vence em breve`,
          title: "Atenção ao vencimento",
          message: `Olá ${user.name || 'Cliente'},<br><br>Este é um lembrete de que a fatura do seu cartão <strong>${cardName}</strong> vence no dia <strong>${dueDay}</strong>.<br>Evite juros e pague em dia.`,
          actionLabel: "Ver Faturas",
          actionUrl: "https://econoplan.cloud/dashboard/cards"
      });
  }
}

/**
 * Convite para novo membro
 */
export async function notifyUserInvited(userId: string, workspaceName: string) {
  const message = `Você foi convidado para colaborar no workspace "${workspaceName}".`;

  // 1. Notificação no Painel
  await sendNotification({
    userId,
    title: "Bem-vindo(a)!",
    message,
    type: 'SUCCESS',
    link: '/dashboard'
  });

  // 2. E-mail
  const user = await getUserEmail(userId);
  if (user?.email) {
      await sendEmail({
          to: user.email,
          subject: `Convite para ${workspaceName}`,
          title: "Você foi convidado!",
          message: `Olá,<br><br>Você recebeu acesso ao workspace <strong>${workspaceName}</strong> no Econoplan.<br>Acesse agora para começar a colaborar.`,
          actionLabel: "Acessar Dashboard",
          actionUrl: "https://econoplan.cloud/dashboard"
      });
  }
}

/**
 * Alerta de Orçamento no Limite (90%)
 */
export async function notifyBudgetWarning(userId: string, categoryName: string, percent: number) {
  const message = `Atenção! Você já consumiu ${percent}% do seu orçamento para ${categoryName}.`;

  await sendNotification({
    userId,
    title: "Alerta de Orçamento",
    message,
    type: 'WARNING',
    link: '/dashboard/budgets'
  });
}

/**
 * Alerta de Orçamento Estourado (100%+)
 */
export async function notifyBudgetExceeded(userId: string, categoryName: string) {
  const message = `Você ultrapassou o limite definido para ${categoryName}. Revise seus gastos.`;

  await sendNotification({
    userId,
    title: "Orçamento Estourado",
    message,
    type: 'ERROR',
    link: '/dashboard/budgets'
  });

  // 2. E-mail (Importante avisar de estouro)
  const user = await getUserEmail(userId);
  if (user?.email) {
      await sendEmail({
          to: user.email,
          subject: `🚨 Orçamento Estourado: ${categoryName}`,
          title: "Limite Atingido",
          message: `Olá ${user.name || ''},<br><br>Seus gastos na categoria <strong>${categoryName}</strong> ultrapassaram o limite planejado.<br>Recomendamos revisar seu fluxo de caixa.`,
          actionLabel: "Revisar Orçamento",
          actionUrl: "https://econoplan.cloud/dashboard/budgets"
      });
  }
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