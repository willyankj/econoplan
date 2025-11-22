import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/providers/session-provider";
import { ThemeProvider } from "@/components/theme-provider"; // <--- IMPORT NOVO

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Econoplan",
  description: "SaaS de Controle Financeiro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning> 
      {/* suppressHydrationWarning é necessário para o next-themes não dar erro no console */}
      <body className={inter.className}>
        <NextAuthSessionProvider>
          {/* Envolvendo tudo com o ThemeProvider */}
          <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Começa escuro por padrão
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}