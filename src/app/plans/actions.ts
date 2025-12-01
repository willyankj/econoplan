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
  
  // CORREÇÃO: URL Dinâmica para permitir testes em localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  try {
    const response = await preference.create({
      body: {
        items: [
          {
            id: "plano-mensal-pro", // ID interno do produto
            title: "Assinatura Econoplan PRO (Mensal)",
            quantity: 1,
            unit_price: 29.90, // Ajuste para o valor real quando for pra produção
            currency_id: 'BRL'
          }
        ],
        payer: {
            email: user.email,
            name: user.name || 'Cliente',
        },
        back_urls: {
            success: `${baseUrl}/plans?status=approved`, 
            failure: `${baseUrl}/plans?status=failure`,
            pending: `${baseUrl}/plans?status=pending`
        },
        auto_return: "approved",
        external_reference: user.tenantId,
        statement_descriptor: "ECONOPLAN",
        binary_mode: true, 
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