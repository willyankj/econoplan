import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // DESATIVE o cache agressivo de navegação frontend. 
  // Isso causa muitos problemas em apps com autenticação.
  aggressiveFrontEndNavCaching: false, 
  
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // Adicione esta regra para garantir que rotas de API e Auth nunca sejam cacheadas
    runtimeCaching: [
      {
        urlPattern: /^https?.+\/api\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https?.+\/dashboard.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'dashboard-routes',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 60, // Cache curto de 1 minuto apenas
          },
        },
      },
      // ... mantenha as regras padrão do plugin se necessário, ou deixe o plugin gerar o resto
    ]
  },
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["econoplan.cloud:3000", "localhost:3000"]
    }
  }
};

export default withPWA(nextConfig);