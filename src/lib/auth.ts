import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (data: any) => {
      const tenantName = `${data.name?.split(' ')[0]}'s Organization` || "Minha Organização";
      const slug = `${tenantName.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID().split('-')[0]}`;

      const tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          slug: slug,
          subscriptionStatus: "INACTIVE",
          planType: "FREE"
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

  session: {
    strategy: "jwt",
  },

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
    async signIn({ user, profile }) {
      if (user.email) {
        try {
          // --- CORREÇÃO AQUI ---
          // Verifica se o usuário JÁ EXISTE antes de tentar atualizar.
          // Se não existir, não faz nada (o createUser lá em cima vai cuidar dele).
          const existingUser = await prisma.user.findUnique({ 
            where: { email: user.email } 
          });

          if (existingUser) {
            const googleProfile = profile as any;
            await prisma.user.update({
              where: { email: user.email },
              data: {
                name: googleProfile?.name || user.name,
                image: googleProfile?.picture || user.image,
                lastLogin: new Date()
              }
            });
          }
        } catch (error) {
          console.error("Erro ao processar login:", error);
          // Não bloqueia o login mesmo se der erro na atualização
        }
      }
      return true;
    },
async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      if (token.email) {
         const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            include: { tenant: true }
         });
         
         if (dbUser) {
            token.tenantId = dbUser.tenantId;
            token.subscriptionStatus = dbUser.tenant.subscriptionStatus;
            token.role = dbUser.role;
            // ADICIONADO:
            token.nextPayment = dbUser.tenant.nextPayment; 
         }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        // @ts-ignore
        session.user.subscriptionStatus = token.subscriptionStatus;
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.nextPayment = token.nextPayment;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
}