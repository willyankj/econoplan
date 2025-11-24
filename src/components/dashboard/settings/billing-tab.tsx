'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, AlertTriangle, Loader2, CheckCircle2, XCircle, ArrowRightLeft, RefreshCw } from "lucide-react";
import { getSubscriptionDetails, cancelSubscription } from "@/app/dashboard/settings/billing-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export function BillingTab() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const result = await getSubscriptionDetails();
    if (result.error) {
        toast.error(result.error);
    } else {
        setData(result);
    }
    setLoading(false);
  }

  // Ação de Cancelamento (Para parar renovação automática ou marcar como cancelado)
  async function handleCancel() {
    if (!confirm("Tem certeza que deseja cancelar a renovação? Seu acesso continuará ativo até o fim do período pago.")) return;
    
    setProcessing(true);
    const result = await cancelSubscription();
    setProcessing(false);

    if (result.error) {
        toast.error(result.error);
    } else {
        toast.success("Renovação cancelada.");
        loadData();
    }
  }

  // Ação de Renovação / Troca (Adiciona créditos)
  async function handleRenewOrChange() {
      // Redireciona com a flag renew=true para o middleware/página não bloquear
      router.push('/plans?renew=true');
  }

  if (loading) {
      return <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /> Carregando...</div>;
  }

  if (!data) return <div>Erro ao carregar dados.</div>;

  // Lógica de Status
  const now = new Date();
  const nextDateObj = data.nextPayment ? new Date(data.nextPayment) : null;
  const nextDateFormatted = nextDateObj ? nextDateObj.toLocaleDateString('pt-BR') : 'N/A';
  
  // Se está ACTIVE ou se está CANCELED mas ainda no prazo
  const hasAccess = data.status === 'ACTIVE' || (data.status === 'CANCELED' && nextDateObj && nextDateObj > now);
  
  // Se tem ID longo (>15), assumimos que é assinatura automática (PreApproval). 
  // Se curto, é pagamento avulso (Pix/Checkout Pro).
  const isAutoRecurring = data.mpId && data.mpId.length > 15; 

  return (
    <div className="space-y-6">
        {data.isSandbox && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Ambiente de Testes (Sandbox)
            </div>
        )}

        <Card className="bg-card border-border shadow-sm">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-500" />
                        Sua Assinatura
                    </span>
                    <Badge variant={hasAccess ? "default" : "destructive"} className={hasAccess ? "bg-emerald-500" : ""}>
                        {hasAccess ? "ACESSO LIBERADO" : "EXPIRADO"}
                    </Badge>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Detalhes do plano e ciclo de cobrança.
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Plano Atual</p>
                        <p className="text-lg font-bold text-foreground">
                            {data.plan === 'FREE' ? 'Gratuito (Trial)' : 'Econoplan Premium'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isAutoRecurring ? 'Cobrança Automática (Cartão)' : 'Pagamento Manual (Pix/Cartão)'}
                        </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                            {data.status === 'ACTIVE' && isAutoRecurring ? "Próxima Cobrança" : "Vencimento do Acesso"}
                        </p>
                        <div className="flex items-center gap-2 text-lg font-bold text-foreground">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            {nextDateFormatted}
                        </div>
                    </div>
                </div>

                {/* MENSAGENS DE STATUS */}
                {data.status === 'ACTIVE' && (
                    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-blue-400">Assinatura Ativa</p>
                            <p className="opacity-80">
                                {isAutoRecurring 
                                    ? "O valor será debitado automaticamente no vencimento." 
                                    : "Você tem acesso garantido até a data de vencimento."}
                            </p>
                        </div>
                    </div>
                )}

                {data.status === 'CANCELED' && hasAccess && (
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-400">Renovação Cancelada</p>
                            <p className="opacity-80">Seu acesso continua ativo até {nextDateFormatted}. Para continuar usando após essa data, realize um novo pagamento.</p>
                        </div>
                    </div>
                )}

                {!hasAccess && (
                    <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-200">
                        <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-rose-400">Plano Expirado</p>
                            <p className="opacity-80">Renove sua assinatura para recuperar o acesso imediato.</p>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* BOTÕES DE AÇÃO */}
            <CardFooter className="border-t border-border bg-muted/10 pt-6 flex flex-col sm:flex-row gap-3 justify-end">
                
                {/* Se for Automático e Ativo, mostra opção de Cancelar */}
                {isAutoRecurring && data.status === 'ACTIVE' && (
                    <Button 
                        variant="ghost" 
                        onClick={handleCancel} 
                        disabled={processing}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Cancelar Assinatura Automática"}
                    </Button>
                )}

                {/* Botão Único para Adicionar Tempo / Renovar / Trocar */}
                {/* No modelo pré-pago, "Trocar forma" é apenas pagar de novo com outro método */}
                <Button 
                    onClick={handleRenewOrChange} 
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    {hasAccess ? "Adicionar +1 Mês / Trocar Pagamento" : "Reativar Agora"}
                </Button>

            </CardFooter>
        </Card>
    </div>
  );
}