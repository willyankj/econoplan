import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Estende a interface de Sessão para incluir dados extras
   */
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string; // <--- Adicionado
      subscriptionStatus: string; // <--- Adicionado
    } & DefaultSession["user"]
  }

  /**
   * Estende a interface de Usuário do Adapter
   */
  interface User {
    tenantId: string;
    role: string;
    lastLogin?: Date | null;
  }
}