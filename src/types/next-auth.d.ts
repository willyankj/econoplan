import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Estende a interface de Sessão para incluir id e tenantId
   */
  interface Session {
    user: {
      id: string;
      tenantId: string;
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
