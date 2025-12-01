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
      // Nome seguro: garante que não quebre se o Google não enviar nome
      const safeName = data.name || "Usuário";
      const tenantName = `${safeName.split(' ')[0]}'s Organization`;
      const slug = `${tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${crypto.randomUUID().split('-')[0]}`;

      // ATOMICIDADE: Garante que User, Tenant e Workspace nasçam juntos.
      const user = await prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.create({
            data: {
              name: tenantName,
              slug: slug,
              subscriptionStatus: "INACTIVE",
              planType: "FREE"
            }
          });

          const newUser = await tx.user.create({
            data: {
              ...data,
              tenantId: tenant.id,
              role: 'OWNER',
              lastLogin: new Date()
            }
          });

          await tx.workspace.create({
            data: {
              name: "Principal",
              tenantId: tenant.id,
              members: { create: { userId: newUser.id, role: 'ADMIN' } },
              bankAccounts: { create: { name: "Carteira", bank: "Dinheiro", balance: 0, isIncluded: true } },
              categories: {
                createMany: {
                  data: [
                    { name: "Salário", type: "INCOME", icon: "Banknote", color: "#10b981" },
                    { name: "Alimentação", type: "EXPENSE", icon: "Utensils", color: "#f43f5e" },
                    { name: "Moradia", type: "EXPENSE", icon: "Home", color: "#3b82f6" },
                    { name: "Transporte", type: "EXPENSE", icon: "Car", color: "#f59e0b" },
                    { name: "Lazer", type: "EXPENSE", icon: "PartyPopper", color: "#8b5cf6" },
                  ]
                }
              }
            }
          });

          return newUser;
      });

      return user;
    }
  } as any, 

  session: {
    strategy: "jwt",
    maxAge: 6 * 60 * 60, // 6 horas
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
         // Otimização: Select apenas nos campos necessários
         const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { tenantId: true, role: true, tenant: { select: { subscriptionStatus: true, nextPayment: true } } }
         });
         
         if (dbUser) {
            token.tenantId = dbUser.tenantId;
            token.subscriptionStatus = dbUser.tenant.subscriptionStatus;
            token.role = dbUser.role;
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