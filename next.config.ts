import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["econoplan.cloud:3000", "localhost:3000"]
    }
  }
};

export default nextConfig;