'use client';

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ShieldCheck, LockKeyhole, UserX } from "lucide-react";
import { createCheckoutSession, checkSubscriptionStatus } from "./actions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function PlansContent() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();

  const isProcessing = searchParams.get('status') === 'pending' || 
                       searchParams.get('status') === 'approved' ||
                       searchParams.get('payment_id');
  
  // Verifica se o usuário está aqui explicitamente para renovar/trocar plano
  const isRenewing = searchParams.get('renew') === 'true';

  // @ts-ignore
  const userRole = session?.user?.role;
  const isOwner = userRole === 'OWNER';

  useEffect(() => {
    // Se estiver em modo de renovação, não roda a verificação automática de saída
    // para não expulsar o usuário da tela de pagamento.
    if (!isRenewing) {
        checkRealStatus();
        const interval = setInterval(() => checkRealStatus(), 3000);
        return () => clearInterval(interval);
    } else {
        // Se for renovação, monitoramos apenas se o pagamento NOVO foi processado
        // (Isso exigiria lógica mais complexa, mas para MVP, deixamos o usuário pagar
        // e ele será redirecionado pelo callback do Mercado Pago depois)
    }
  }, [isRenewing]);

  async function checkRealStatus() {
    try {
        const realStatus = await checkSubscriptionStatus();
        // Se estiver ATIVO e NÃO estiver tentando renovar, redireciona pro Dashboard
        if (realStatus === 'ACTIVE' && !isRenewing) {
            if (isOwner) toast.success("Sua assinatura já está ativa!");
            await update();
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.error("Erro ao verificar status:", error);
    }
  }

  async function handleSubscribe() {
    setIsLoading(true);
    const result = await createCheckoutSession();
    
    if (result?.url) {
        window.location.href = result.url; 
    } else {
        toast.error("Erro ao iniciar pagamento.");
        setIsLoading(false);
    }
  }

  // --- TELA DE PROCESSAMENTO ---
  if (isProcessing) {
    return (
        <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
            <Card className="bg-[#12141c] border-emerald-500/30 shadow-2xl max-w-md w-full text-center py-10">
                <CardContent className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Confirmando...</h2>
                        <p className="text-slate-400 text-sm px-4">Estamos processando sua renovação.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  // --- TELA DE BLOQUEIO (MEMBROS) ---
  if (session && !isOwner) {
    return (
        <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
            <Card className="bg-[#12141c] border-rose-900/50 shadow-2xl max-w-md w-full text-center py-10">
                <CardContent className="space-y-6">
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                        <LockKeyhole className="w-8 h-8 text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Acesso Suspenso</h2>
                        <p className="text-slate-400 text-sm px-6">
                            Apenas o Proprietário pode gerenciar a assinatura.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  // --- TELA DE PAGAMENTO ---
  return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 relative z-10">
            <div className="flex flex-col justify-center space-y-6 text-slate-200">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        {isRenewing ? "Renovar Acesso" : "Ativar Econoplan"}
                    </h1>
                    <p className="text-slate-400">
                        {isRenewing 
                            ? "Adicione mais tempo ao seu plano ou troque a forma de pagamento."
                            : "Finalize a assinatura para liberar o acesso."}
                    </p>
                </div>
                <div className="space-y-4">
                    {["Workspaces Ilimitados", "Membros Ilimitados", "Gestão Completa", "Suporte Prioritário"].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="bg-[#12141c] border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">PREMIUM</div>
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-white text-2xl">Assinatura Mensal</CardTitle>
                    <CardDescription className="text-slate-400">Cancele quando quiser.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <div className="space-y-1">
                        <span className="text-4xl font-bold text-white">R$ 29,90</span>
                        <span className="text-slate-500">/mês</span>
                    </div>
                    <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-12 font-bold text-lg shadow-lg" onClick={handleSubscribe} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (isRenewing ? "Renovar Agora" : "Assinar e Ativar")}
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-500/60 pt-2 border-t border-slate-800/50">
                        <ShieldCheck className="w-3 h-3" /> Pagamento seguro
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c10]" />}>
      <PlansContent />
    </Suspense>
  );
}