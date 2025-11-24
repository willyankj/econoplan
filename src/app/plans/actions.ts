'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { Preference } from 'mercadopago';
import { redirect } from "next/navigation";

// MODO PRODUÇÃO
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_A_TOKEN!, 
    options: { timeout: 10000 } 
});

// --- Função de verificação do banco (Mantida) ---
export async function checkSubscriptionStatus() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { tenant: true }
    });

    if (user?.tenant) {
        return user.tenant.subscriptionStatus; 
    }
    return null;
}

export async function createCheckoutSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  });

  if (!user) return;

  const preference = new Preference(client);
  const baseUrl = "https://econoplan.cloud";
  
  try {
    const response = await preference.create({
      body: {
        items: [
          {
            id: "plano-teste-1real",
            title: "Assinatura Econoplan (Teste 1 Real)",
            quantity: 1,
            unit_price: 1.00, 
            currency_id: 'BRL'
          }
        ],
        payer: {
            email: user.email,
            name: user.name || 'Cliente',
            // Não enviamos sobrenome ou endereço para forçar o MP a pedir os dados necessários (CPF)
        },
        back_urls: {
            success: `${baseUrl}/plans?status=approved`, // Mudamos para /plans para o script da página capturar
            failure: `${baseUrl}/plans?status=failure`,
            pending: `${baseUrl}/plans?status=pending`
        },
        auto_return: "approved",
        external_reference: user.tenantId,
        statement_descriptor: "ECONOPLAN",
        binary_mode: true, // Força aprovação instantânea (bom para Pix)
        
        // Removemos restrições de métodos de pagamento para evitar bugs visuais
        // O MP vai mostrar tudo o que sua conta aceita (Pix, Cartão, Boleto, etc)
      }
    });

    if (response.init_point) {
        return { url: response.init_point };
    } else {
        console.error("[MP Error] Resposta sem link:", response);
        return { error: "O Mercado Pago não retornou o link." };
    }

  } catch (error: any) {
    console.error("[MP API Error]", JSON.stringify(error, null, 2));
    return { error: "Erro interno ao criar checkout." };
  }
}