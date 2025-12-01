import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
    const isSettings = req.nextUrl.pathname.startsWith("/dashboard/settings");

    if (isDashboard && token) {
      const user = token as any;
      const status = user.subscriptionStatus;
      const planType = user.planType || 'FREE'; // Fallback seguro
      
      const nextPayment = user.nextPayment ? new Date(user.nextPayment) : null;
      const now = new Date();
      
      // Lógica de Validação:
      // 1. Sempre permite acesso a configurações (para o usuário poder pagar/cancelar/editar perfil)
      // 2. Permite se for plano FREE
      // 3. Permite se estiver ATIVO ou em TRIAL
      // 4. Permite se Cancelado mas ainda dentro do prazo pago
      const isValid = 
        isSettings || 
        planType === 'FREE' ||
        status === 'ACTIVE' || 
        status === 'TRIAL_PREMIUM' || 
        (status === 'CANCELED' && nextPayment && nextPayment > now);

      if (!isValid) {
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
  matcher: ["/dashboard/:path*", "/plans"],
};