import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
    const isPlansPage = req.nextUrl.pathname.startsWith("/plans");

    // Se não tiver token, o withAuth já redireciona para login.
    
    // Se o usuário estiver tentando acessar o dashboard
    if (isDashboard && token) {
      // Aqui precisaríamos saber o status da assinatura do token.
      // Como o token do NextAuth é gerado no login, precisamos garantir que ele tenha essa info.
      // Se o status for TRIAL ou INACTIVE, manda para os planos.
      
      // NOTA: Para simplificar, vamos assumir que você vai adicionar 'subscriptionStatus' ao token no auth.ts
      // Se não tiver status ou não for ACTIVE, redireciona.
      const status = (token as any).subscriptionStatus;
      
      if (status !== 'ACTIVE' && status !== 'TRIAL_PREMIUM') {
         return NextResponse.redirect(new URL("/plans", req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/plans/:path*"],
};
