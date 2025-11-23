import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  ShieldCheck, 
  PieChart, 
  Target, 
  CreditCard, 
  Users, 
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 selection:bg-emerald-500/30 font-sans">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />
      
      {/* --- NAVBAR --- */}
      <header className="relative z-50 border-b border-slate-800/50 bg-[#0a0c10]/80 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            Econoplan
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link href="#features" className="hover:text-white transition-colors">Recursos</Link>
            <Link href="#testimonials" className="hover:text-white transition-colors">Depoimentos</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:flex text-slate-300 hover:text-white hover:bg-slate-800">
                Entrar
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        
        {/* --- HERO SECTION --- */}
        <section className="pt-20 pb-32 px-4 text-center relative overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none opacity-20" />
          
          <div className="max-w-5xl mx-auto space-y-8 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-emerald-400 text-xs font-medium mb-4 animate-fade-in hover:bg-slate-800/80 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Nova Versão 2.0 Disponível
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
              O controle financeiro que sua <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-500 to-emerald-400 animate-gradient">
                família e empresa merecem.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Gerencie múltiplas contas, cartões e orçamentos em um único lugar. 
              Compartilhe metas com sua família ou equipe sem perder a privacidade.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-200 font-bold text-base w-full">
                  Criar Conta Grátis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="#features" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-12 px-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full">
                  Ver como funciona
                </Button>
              </Link>
            </div>

            {/* Mockup Preview com a Imagem Real */}
            <div className="mt-16 relative rounded-xl border border-slate-800 bg-slate-900/50 shadow-2xl overflow-hidden p-2 group">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0c10] z-20 pointer-events-none h-full w-full" />
               
               <div className="relative aspect-video bg-slate-800/30 rounded-lg overflow-hidden">
                  <Image 
                    src="/hero-image.jpg" 
                    alt="Dashboard Preview" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
               </div>
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section id="features" className="py-24 bg-slate-900/30 border-y border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Tudo o que você precisa para crescer</h2>
              <p className="text-slate-400 text-lg">
                Esqueça planilhas complexas. O Econoplan traz clareza para suas finanças com ferramentas poderosas e simples de usar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-slate-800/20 border border-slate-700/30 p-6 rounded-2xl hover:bg-slate-800/40 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Multi-Workspace</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Separe suas finanças pessoais, da empresa e da família em áreas de trabalho totalmente isoladas.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-800/20 border border-slate-700/30 p-6 rounded-2xl hover:bg-slate-800/40 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Metas Compartilhadas</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Crie objetivos conjuntos (como uma viagem) e permita que membros contribuam a partir de suas próprias contas.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-800/20 border border-slate-700/30 p-6 rounded-2xl hover:bg-slate-800/40 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Gestão de Faturas</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Controle limites e vencimentos. O sistema avisa quando uma fatura está próxima de vencer para você não pagar juros.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-slate-800/20 border border-slate-700/30 p-6 rounded-2xl hover:bg-slate-800/40 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-rose-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PieChart className="w-6 h-6 text-rose-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Orçamentos Inteligentes</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Defina tetos de gastos por categoria (ex: Mercado, Lazer) e receba alertas antes de estourar o orçamento.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-slate-800/20 border border-slate-700/30 p-6 rounded-2xl hover:bg-slate-800/40 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Auditoria & Segurança</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Registro detalhado de todas as ações. Saiba quem criou, editou ou excluiu qualquer registro na organização.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-slate-800/20 border border-slate-700/30 p-6 rounded-2xl hover:bg-slate-800/40 transition-all hover:-translate-y-1 group flex flex-col justify-center items-center text-center">
                <h3 className="text-xl font-bold text-white mb-2">+ Muito Mais</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Relatórios, Extratos CSV, Modo Escuro...
                </p>
                <Link href="/login">
                  <Button variant="secondary" size="sm" className="hover:bg-white hover:text-slate-900">
                    Explorar Tudo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS SECTION --- */}
        <section id="testimonials" className="py-24 overflow-hidden relative">
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">O que dizem nossos usuários</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                    name: "Carlos Mendes", 
                    role: "Empresário", 
                    text: "Finalmente consegui separar as contas da minha agência das minhas contas pessoais. A função de Workspaces é genial.",
                    avatar: "/avatar2.jpg"
                },
                { 
                    name: "Fernanda Souza", 
                    role: "Designer", 
                    text: "A meta compartilhada me ajudou a juntar dinheiro com meu marido para nossa lua de mel. Visualizar o progresso motiva muito!",
                    avatar: "/avatar1.jpg"
                },
                { 
                    name: "Roberto Lima", 
                    role: "Engenheiro", 
                    text: "Simples, direto e bonito. O modo escuro é perfeito e o sistema de auditoria me dá segurança para adicionar minha equipe.",
                    avatar: "/avatar3.jpg"
                }
              ].map((t, i) => (
                <div key={i} className="bg-[#151821] p-8 rounded-2xl border border-slate-800 relative hover:border-slate-700 transition-colors">
                   <div className="flex gap-1 text-emerald-500 mb-6">
                      {[1,2,3,4,5].map(star => <span key={star}>★</span>)}
                   </div>
                   <p className="text-slate-300 mb-8 text-sm leading-relaxed italic">"{t.text}"</p>
                   
                   <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700">
                        <Image 
                            src={t.avatar} 
                            alt={t.name} 
                            fill 
                            className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{t.name}</p>
                        <p className="text-slate-500 text-xs">{t.role}</p>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-24 relative px-4">
            <div className="container mx-auto">
                <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 border border-emerald-500/20 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden backdrop-blur-sm">
                    {/* Abstract shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                    
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">
                        Pronto para assumir o controle?
                    </h2>
                    <p className="text-slate-300 text-lg max-w-xl mx-auto mb-10 relative z-10">
                        Junte-se a centenas de pessoas que já organizaram sua vida financeira com o Econoplan.
                    </p>
                    <Link href="/login" className="relative z-10">
                        <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-bold h-14 px-10 text-lg shadow-xl hover:scale-105 transition-transform">
                            Começar Agora Gratuitamente
                        </Button>
                    </Link>
                </div>
            </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-[#050608] border-t border-slate-800 py-12 text-slate-400 text-sm">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2 font-semibold text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Econoplan
                </div>
                <div className="flex gap-8">
                    <a href="#" className="hover:text-white transition-colors">Sobre</a>
                    <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                    <a href="#" className="hover:text-white transition-colors">Termos</a>
                    <a href="#" className="hover:text-white transition-colors">Contato</a>
                </div>
                <div className="text-slate-500">
                    © 2025 Econoplan. Todos os direitos reservados.
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}