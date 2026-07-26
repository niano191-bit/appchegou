import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ajuda o cliente a detectar deploy novo e recarregar (evita ChunkLoadError)
  deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
};

export default nextConfig;
