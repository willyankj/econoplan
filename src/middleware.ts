import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

    if (isDashboard && token) {
      const user = token as any;
      const status = user.subscriptionStatus;
      
      // Verifica se tem data de vencimento
      const nextPayment = user.nextPayment ? new Date(user.nextPayment) : null;
      const now = new Date();
      
      // Lógica de Liberação:
      // 1. Se for ACTIVE, libera.
      // 2. Se for TRIAL_PREMIUM, libera.
      // 3. Se for CANCELED, mas a data de vencimento ainda for futura, libera.
      const isValid = 
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