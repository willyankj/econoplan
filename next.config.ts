import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // TypeScript ainda é suportado aqui
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ["econoplan.cloud:3000", "localhost:3000"]
    }
  }
};

export default withPWA(nextConfig);