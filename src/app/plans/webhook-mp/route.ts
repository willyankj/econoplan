import { NextResponse } from "next/server";
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { prisma } from "@/lib/prisma";

// MODO PRODUÇÃO
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_A_TOKEN!, 
    options: { timeout: 5000 } 
});

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const topic = url.searchParams.get("topic") || url.searchParams.get("type");
        const id = url.searchParams.get("id") || url.searchParams.get("data.id");

        console.log(`[WEBHOOK] Recebido: ${topic} | ID: ${id}`);

        if (!id) return NextResponse.json({ received: true }, { status: 200 });

        if (topic === 'payment' || topic === 'subscription_authorized_payment') {
            try {
                const payment = new Payment(client);
                const paymentData = await payment.get({ id: id });

                if (paymentData.status === 'approved') {
                    const tenantId = paymentData.external_reference;

                    if (tenantId) {
                        // --- CÁLCULO DE VENCIMENTO (MÊS CALENDÁRIO) ---
                        const today = new Date();
                        const nextPayment = new Date(today);
                        
                        // Adiciona 1 mês exato no calendário
                        nextPayment.setMonth(nextPayment.getMonth() + 1);

                        // Correção para dias que não existem no mês seguinte (ex: 31/Jan -> Fev)
                        // Se o dia mudou (ex: era 31 e virou 03/Março), voltamos para o último dia do mês correto
                        if (nextPayment.getDate() !== today.getDate()) {
                            nextPayment.setDate(0); 
                        }
                        // ------------------------------------------------

                        await prisma.tenant.update({
                            where: { id: tenantId },
                            data: {
                                subscriptionStatus: 'ACTIVE',
                                nextPayment: nextPayment,
                                planType: 'MONTHLY_PROD',
                                mercadoPagoId: id.toString()
                            }
                        });
                        console.log(`[WEBHOOK] SUCESSO! Tenant ${tenantId} renovado até ${nextPayment.toLocaleDateString('pt-BR')}.`);
                    }
                }
            } catch (mpError) {
                console.log(`[WEBHOOK] Erro ao buscar pagamento ${id} (pode ser teste).`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("[WEBHOOK ERROR]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}