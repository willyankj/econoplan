'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  
  const features = [
    "Gestão multi-contas e cartões",
    "Controle de orçamentos mensais",
    "Relatórios inteligentes e gráficos",
    "Segurança de dados bancários"
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0c10] relative overflow-hidden">
      
      {/* --- BACKGROUND EFFECTS --- */}
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      
      {/* Green Glow Top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none opacity-30" />
      
      {/* Bottom Glow */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none opacity-20" />


      {/* --- MAIN CARD --- */}
      <Card className="w-full max-w-md bg-[#12141c]/80 backdrop-blur-xl border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-900/20 mb-2">
            <TrendingUp className="text-white w-7 h-7" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Bem-vindo ao Econoplan
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Domine suas finanças pessoais e empresariais em um único lugar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          
          {/* Lista de Benefícios */}
          <div className="grid gap-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#12141c] px-2 text-slate-500">Acesso Seguro</span>
            </div>
          </div>

          {/* Botão de Login */}
          <Button 
            size="lg" 
            className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold transition-all h-12"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Continuar com Google
          </Button>

        </CardContent>

        <CardFooter className="flex flex-col gap-4 pb-8 pt-2">
          <p className="text-center text-xs text-slate-500 px-8">
            Ao clicar em continuar, você concorda com nossos <span className="underline cursor-pointer hover:text-slate-400">Termos de Serviço</span> e <span className="underline cursor-pointer hover:text-slate-400">Política de Privacidade</span>.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-500/50 font-medium">
            <ShieldCheck className="w-3 h-3" /> Ambiente Criptografado
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
