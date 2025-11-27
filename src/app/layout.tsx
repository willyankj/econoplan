import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/providers/session-provider";
// 1. IMPORTAR O NOVO PROVIDER
import { AutoLogoutProvider } from "@/providers/auto-logout-provider"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Econoplan",
  description: "Gerenciamento financeiro inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          {/* 2. ADICIONAR O AUTO LOGOUT AQUI, DENTRO DO SESSION PROVIDER */}
          <AutoLogoutProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </AutoLogoutProvider>
        </SessionProvider>
      </body>
    </html>
  );
}