import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/providers/session-provider";
import { AutoLogoutProvider } from "@/providers/auto-logout-provider"; 

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Impede zoom acidental no app instalado
};

export const metadata: Metadata = {
  title: "Econoplan",
  description: "Gerenciamento financeiro inteligente",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg", // Favicon padrão
    shortcut: "/icon.svg",
    apple: "/icon.svg", // O iOS vai tentar usar, mas idealmente seria PNG
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Econoplan",
  },
  formatDetection: {
    telephone: false,
  },
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