import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/providers/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner"; // <--- IMPORT NOVO

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
      <body className={inter.className}>
        <NextAuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster /> {/* <--- ADICIONADO AQUI */}
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}