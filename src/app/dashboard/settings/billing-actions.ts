'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { PreApproval } from 'mercadopago';
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";

// Usa o token correto dependendo do ambiente (Sandbox ou Produção)
const isSandbox = !!process.env.MP_T_A_TOKEN;
const token = isSandbox ? process.env.MP_T_A_TOKEN! : process.env.MP_A_TOKEN!;

const client = new MercadoPagoConfig({ 
    accessToken: token, 
    options: { timeout: 10000 } 
});

export async function getSubscriptionDetails() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user || user.role !== 'OWNER') return { error: "Apenas o proprietário pode ver detalhes da cobrança." };

  const { subscriptionStatus, planType, nextPayment, mercadoPagoId } = user.tenant;

  // Se tiver ID do MP, tentamos buscar dados frescos na API
  let mpStatus = null;
  let externalReference = null;

  if (mercadoPagoId && mercadoPagoId !== 'manual') {
      try {
          // Se for ID numérico curto (ex: pagamento único/Pix), é Payment
          // Se for ID alfanumérico longo (ex: 2c938...), é PreApproval (Assinatura)
          
          // Como nosso sistema híbrido salvou o ID do pagamento (Pix) ou da assinatura,
          // vamos focar no status que está no banco, que é o mais confiável para o nosso controle.
          // Mas se for assinatura recorrente, podemos tentar consultar:
          if (planType?.includes('MONTHLY')) {
             const preapproval = new PreApproval(client);
             // Tenta buscar (pode falhar se foi pagamento avulso/pix, então usamos try/catch silencioso)
             const sub = await preapproval.get({ id: mercadoPagoId });
             mpStatus = sub.status;
             externalReference = sub.external_reference;
          }
      } catch (e) {
          // Ignora erro de busca no MP, usa dados do banco
          console.log("Não foi possível buscar detalhes no MP (pode ser pagamento avulso):", e);
      }
  }

  return {
    status: subscriptionStatus,
    plan: planType,
    nextPayment: nextPayment,
    mpId: mercadoPagoId,
    isSandbox // Retorna para o front saber se mostra aviso de teste
  };
}

export async function cancelSubscription() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Não autorizado" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user || user.role !== 'OWNER') return { error: "Sem permissão." };

  const { mercadoPagoId } = user.tenant;

  if (!mercadoPagoId) return { error: "Nenhuma assinatura ativa encontrada para cancelar." };

  try {
      // Tenta cancelar no Mercado Pago se for uma assinatura recorrente
      const preapproval = new PreApproval(client);
      await preapproval.update({ 
          id: mercadoPagoId, 
          body: { status: 'cancelled' } 
      });
  } catch (error) {
      console.error("Erro ao cancelar no MP (pode ser pagamento único):", error);
      // Mesmo que falhe no MP (ex: era Pix avulso), cancelamos no banco para não renovar
  }

  // Atualiza no Banco
  await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
          subscriptionStatus: 'CANCELED',
          // Mantemos o nextPayment para ele continuar usando até o fim do período pago
      }
  });

  await createAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'UPDATE',
      entity: 'Subscription',
      details: 'Cancelou a assinatura recorrente'
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}
