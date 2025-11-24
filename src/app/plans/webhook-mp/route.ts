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
                        // 1. Busca o Tenant para saber a data atual de vencimento
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: { nextPayment: true }
                        });

                        if (tenant) {
                            // --- LÓGICA CORRIGIDA DE VENCIMENTO ---
                            const today = new Date();
                            // Se existe vencimento futuro, usa ele como base. Se não (ou se já venceu), usa hoje.
                            let baseDate = today;
                            if (tenant.nextPayment && new Date(tenant.nextPayment) > today) {
                                baseDate = new Date(tenant.nextPayment);
                            }

                            const nextPayment = new Date(baseDate);
                            // Adiciona 1 mês à data base (hoje ou vencimento futuro)
                            nextPayment.setMonth(nextPayment.getMonth() + 1);

                            // Correção para dias que não existem no mês seguinte (ex: 31/Jan -> Fev)
                            // Se o dia do mês mudou, significa que o mês seguinte não tem aquele dia (ex: foi pra 02/Março)
                            // Então voltamos para o último dia do mês anterior (28 ou 29/Fev)
                            if (nextPayment.getDate() !== baseDate.getDate()) {
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
                }
            } catch (mpError) {
                console.log(`[WEBHOOK] Erro ao buscar pagamento ${id} (pode ser teste):`, mpError);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("[WEBHOOK ERROR]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}