import { NextResponse } from "next/server";
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { prisma } from "@/lib/prisma";
import crypto from 'crypto';
import { addMonths } from "date-fns";

// MODO PRODUÇÃO
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_A_TOKEN!, 
    options: { timeout: 5000 } 
});

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const topic = url.searchParams.get("topic") || url.searchParams.get("type");
        const id = url.searchParams.get("id") || url.searchParams.get("data.id");

        // 1. VALIDAÇÃO DE ASSINATURA (HMAC)
        if (WEBHOOK_SECRET) {
            const xSignature = request.headers.get("x-signature");
            const xRequestId = request.headers.get("x-request-id");

            if (!xSignature || !xRequestId) {
                return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
            }

            const parts = xSignature.split(';');
            let ts = '';
            let hash = '';

            parts.forEach(part => {
                const [key, value] = part.split('=');
                if (key === 'ts') ts = value;
                if (key === 'v1') hash = value;
            });

            const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
            const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
            const digest = hmac.update(manifest).digest('hex');

            if (digest !== hash) {
                console.error("[WEBHOOK] Assinatura inválida.");
                return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
            }
        }

        console.log(`[WEBHOOK] Recebido e Validado: ${topic} | ID: ${id}`);

        if (!id) return NextResponse.json({ received: true }, { status: 200 });

        if (topic === 'payment' || topic === 'subscription_authorized_payment') {
            try {
                const payment = new Payment(client);
                const paymentData = await payment.get({ id: id });

                if (paymentData.status === 'approved') {
                    const tenantId = paymentData.external_reference;

                    if (tenantId) {
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: { nextPayment: true }
                        });

                        if (tenant) {
                            const today = new Date();
                            let baseDate = today;
                            
                            // Se já tem data futura paga, soma a partir dela
                            if (tenant.nextPayment && new Date(tenant.nextPayment) > today) {
                                baseDate = new Date(tenant.nextPayment);
                            }

                            // CORREÇÃO: Uso de addMonths para consistência e segurança
                            const nextPayment = addMonths(baseDate, 1);

                            await prisma.tenant.update({
                                where: { id: tenantId },
                                data: {
                                    subscriptionStatus: 'ACTIVE',
                                    nextPayment: nextPayment,
                                    planType: 'MONTHLY_PROD',
                                    mercadoPagoId: id.toString()
                                }
                            });
                            console.log(`[WEBHOOK] SUCESSO! Tenant ${tenantId} renovado.`);
                        }
                    }
                }
            } catch (mpError) {
                console.log(`[WEBHOOK] Erro ao buscar pagamento ${id}:`, mpError);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("[WEBHOOK ERROR]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}