import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export const authOptions: NextAuthOptions = {
  // CORREÇÃO AQUI: Adicionado 'as any' para resolver o conflito de versões de tipos
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (data: any) => {
      const tenantName = `${data.name?.split(' ')[0]}'s Organization` || "Minha Organização";
      const slug = `${tenantName.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID().split('-')[0]}`;

      const tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          slug: slug,
          subscriptionStatus: "TRIAL"
        }
      });

      const user = await prisma.user.create({
        data: {
          ...data,
          tenantId: tenant.id,
          role: 'OWNER',
          lastLogin: new Date()
        }
      });

      await prisma.workspace.create({
        data: {
          name: "Principal",
          tenantId: tenant.id,
          members: { create: { userId: user.id, role: 'ADMIN' } },
          bankAccounts: { create: { name: "Carteira", bank: "Dinheiro", balance: 0 } },
          categories: {
            createMany: {
              data: [
                { name: "Salário", type: "INCOME" },
                { name: "Alimentação", type: "EXPENSE" },
                { name: "Moradia", type: "EXPENSE" },
                { name: "Transporte", type: "EXPENSE" },
              ]
            }
          }
        }
      });

      return user;
    }
  } as any, 

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        try {
          const googleProfile = profile as any;
          
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: googleProfile?.name || user.name,
              image: googleProfile?.picture || user.image,
              lastLogin: new Date()
            }
          });
        } catch (error) {
          console.error("Erro ao atualizar usuário:", error);
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id;
        session.user.tenantId = user.tenantId; 
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
}